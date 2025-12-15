using MQTTnet;
using MQTTnet.Client;
using MQTTnet.Extensions.ManagedClient;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using NeloFMS.API.Models;
using System.Security.Cryptography.X509Certificates;
using System.Text.Json;
using System.Text;
using MQTTnet.Certificates;
using System.Security.Authentication;

namespace NeloFMS.API.Services
{
    public class MqttSubscriptionService : IHostedService, IDisposable
    {
        private readonly ILogger<MqttSubscriptionService> _logger;
        private readonly IHubContext<VehicleDataHub> _hubContext;
        private readonly IConfiguration _configuration;
        private readonly VehicleDataProxyService _proxyService;
        private readonly IServiceScopeFactory _serviceScopeFactory;
        private IManagedMqttClient? _mqttClient;
        private bool _disposed = false;

        public MqttSubscriptionService(
            ILogger<MqttSubscriptionService> logger,
            IHubContext<VehicleDataHub> hubContext,
            IConfiguration configuration,
            VehicleDataProxyService proxyService,
            IServiceScopeFactory serviceScopeFactory)
        {
            _logger = logger;
            _hubContext = hubContext;
            _configuration = configuration;
            _proxyService = proxyService;
            _serviceScopeFactory = serviceScopeFactory;
        }

        public async Task StartAsync(CancellationToken cancellationToken)
        {
            try
            {
                _logger.LogInformation("Starting MQTT subscription service...");

                // Check if MQTT is enabled in configuration
                var mqttEnabled = _configuration.GetValue<bool>("Mqtt:Enabled", true);
                if (!mqttEnabled)
                {
                    _logger.LogInformation("MQTT service is disabled in configuration");
                    return;
                }

                // Load certificates
                var certPath = Path.Combine(Directory.GetCurrentDirectory(), "certs");
                var caCertPath = Path.Combine(certPath, "ca.crt");
                var clientCertPath = Path.Combine(certPath, "client1.crt");
                var clientKeyPath = Path.Combine(certPath, "client1.key");

                // Verify certificate files exist
                if (!File.Exists(clientCertPath) || !File.Exists(clientKeyPath))
                {
                    _logger.LogWarning("Certificate files not found. MQTT service will not start.");
                    _logger.LogWarning($"Expected client cert: {clientCertPath}");
                    _logger.LogWarning($"Expected client key: {clientKeyPath}");
                    return;
                }

                // Load client certificate and key (CA cert not needed for client auth)
                var clientCert = LoadClientCertificate(clientCertPath, clientKeyPath);
                _logger.LogInformation($"Loaded client certificate: {clientCert.Subject}");

                // Get MQTT configuration
                var mqttHost = _configuration.GetValue<string>("Mqtt:Host", "app.nelotec.co.za");
                var mqttPort = _configuration.GetValue<int>("Mqtt:Port", 8883);
                var useTls = _configuration.GetValue<bool>("Mqtt:UseTls", true);

                // Configure MQTT client
                var mqttFactory = new MqttFactory();
                _mqttClient = mqttFactory.CreateManagedMqttClient();

                var clientOptionsBuilder = new MqttClientOptionsBuilder()
                    .WithTcpServer(mqttHost, mqttPort)
                    .WithClientId($"NeloFMS_API_{Environment.MachineName}_{Guid.NewGuid()}")
                    .WithCleanSession(true);

                if (useTls)
                {
                    clientOptionsBuilder.WithTlsOptions(o =>
                    {
                        o.UseTls();
                        o.WithSslProtocols(SslProtocols.Tls12 | SslProtocols.Tls13);
                        o.WithCertificateValidationHandler(certContext =>
                        {
                            // More permissive validation for development
                            _logger.LogInformation($"Validating certificate: {certContext.Certificate?.Subject}");
                            return true;
                        });
                        o.WithClientCertificates(new List<X509Certificate2> { clientCert });
                        o.WithTargetHost(mqttHost);
                    });
                }

                var clientOptions = clientOptionsBuilder.Build();

                var managedOptions = new ManagedMqttClientOptionsBuilder()
                    .WithClientOptions(clientOptions)
                    .WithAutoReconnectDelay(TimeSpan.FromSeconds(5))
                    .Build();

                // Set up event handlers
                _mqttClient.ApplicationMessageReceivedAsync += OnMessageReceived;
                _mqttClient.ConnectedAsync += OnConnected;
                _mqttClient.DisconnectedAsync += OnDisconnected;
                _mqttClient.ConnectingFailedAsync += OnConnectingFailed;

                // Start the client
                await _mqttClient.StartAsync(managedOptions);

                // Subscribe to the topic pattern
                var topic = _configuration.GetValue<string>("Mqtt:Topic", "+/data");
                var topicFilters = new List<MQTTnet.Packets.MqttTopicFilter>
                {
                    new MqttTopicFilterBuilder()
                        .WithTopic(topic)
                        .WithQualityOfServiceLevel(MQTTnet.Protocol.MqttQualityOfServiceLevel.AtLeastOnce)
                        .Build()
                };

                await _mqttClient.SubscribeAsync(topicFilters);

                _logger.LogInformation($"MQTT subscription service started successfully, subscribed to topic: {topic}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to start MQTT subscription service");
            }
        }

        public async Task StopAsync(CancellationToken cancellationToken)
        {
            try
            {
                _logger.LogInformation("Stopping MQTT subscription service...");
                
                if (_mqttClient != null)
                {
                    await _mqttClient.StopAsync();
                }
                
                _logger.LogInformation("MQTT subscription service stopped");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error stopping MQTT subscription service");
            }
        }

        private async Task OnMessageReceived(MqttApplicationMessageReceivedEventArgs args)
        {
            try
            {
                var topic = args.ApplicationMessage.Topic;
                var payload = Encoding.UTF8.GetString(args.ApplicationMessage.PayloadSegment);
                
                _logger.LogInformation($"Received MQTT message on topic: {topic}");
                _logger.LogDebug($"Payload: {payload}");

                // Extract IMEI from topic (format: "{imei}/data")
                var topicParts = topic.Split('/');
                if (topicParts.Length >= 2)
                {
                    var imei = topicParts[0];
                    
                    // Parse the JSON payload
                    var vehicleData = ParseVehicleData(payload, imei);
                    
                    if (vehicleData != null)
                    {
                        // Add to proxy service to enrich with latest known values
                        var enrichedData = _proxyService.AddData(vehicleData);
                        
                        // Update vehicle location in database asynchronously
                        _ = Task.Run(async () =>
                        {
                            try
                            {
                                using var scope = _serviceScopeFactory.CreateScope();
                                var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                                
                                // Find vehicle by IMEI through tracking unit
                                var trackingUnit = await dbContext.TrackingUnits
                                    .Include(tu => tu.Vehicle)
                                    .FirstOrDefaultAsync(tu => tu.ImeiNumber == imei);
                                
                                if (trackingUnit?.Vehicle != null)
                                {
                                    var vehicle = trackingUnit.Vehicle;
                                    vehicle.LastLatitude = enrichedData.Latitude;
                                    vehicle.LastLongitude = enrichedData.Longitude;
                                    vehicle.LastSpeed = enrichedData.Speed;
                                    vehicle.LastLocationUpdate = enrichedData.Timestamp;
                                    
                                    // Update ignition status if available
                                    if (enrichedData.Ignition.HasValue)
                                    {
                                        vehicle.Ignition = enrichedData.Ignition.Value;
                                    }
                                    
                                    // Update odometer if available
                                    if (enrichedData.Odometer.HasValue)
                                    {
                                        vehicle.Odometer = (int)enrichedData.Odometer.Value;
                                    }
                                    
                                    await dbContext.SaveChangesAsync();
                                }
                            }
                            catch (Exception ex)
                            {
                                _logger.LogError(ex, $"Error updating vehicle location for IMEI {imei}");
                            }
                        });
                        
                        // Write to InfluxDB asynchronously (fire and forget with error handling)
                        _ = Task.Run(async () =>
                        {
                            try
                            {
                                using var scope = _serviceScopeFactory.CreateScope();
                                var influxService = scope.ServiceProvider.GetRequiredService<InfluxService>();
                                await influxService.WriteVehicleDataAsync(enrichedData);
                            }
                            catch (Exception ex)
                            {
                                _logger.LogError(ex, $"Error writing vehicle data to InfluxDB for IMEI {imei}");
                            }
                        });
                        
                        // Send to all connected clients
                        await _hubContext.Clients.Group("VehicleData")
                            .SendAsync("VehicleDataReceived", enrichedData);
                        
                        // Send to specific device group
                        await _hubContext.Clients.Group($"Device_{imei}")
                            .SendAsync("DeviceDataReceived", enrichedData);
                        
                        _logger.LogDebug($"Forwarded enriched vehicle data for IMEI: {imei}");
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing MQTT message");
            }
        }

        private async Task OnConnected(MqttClientConnectedEventArgs args)
        {
            _logger.LogInformation("Connected to MQTT broker");
        }

        private async Task OnDisconnected(MqttClientDisconnectedEventArgs args)
        {
            _logger.LogWarning($"Disconnected from MQTT broker: {args.Reason}");
        }

        private async Task OnConnectingFailed(ConnectingFailedEventArgs args)
        {
            _logger.LogError(args.Exception, "Failed to connect to MQTT broker");
        }

        private VehicleDataMessage? ParseVehicleData(string payload, string imei)
        {
            try
            {
                // Try to parse as JSON first
                var jsonDoc = JsonDocument.Parse(payload);
                var root = jsonDoc.RootElement;

                // Check if this is the AWS IoT Shadow format: {"state":{"reported":{...}}}
                JsonElement dataElement = root;
                if (root.TryGetProperty("state", out var stateElement))
                {
                    if (stateElement.TryGetProperty("reported", out var reportedElement))
                    {
                        dataElement = reportedElement;
                    }
                }

                // Parse timestamp (ts field in milliseconds)
                DateTime timestamp = DateTime.UtcNow;
                if (dataElement.TryGetProperty("ts", out var tsElement) && tsElement.TryGetInt64(out var tsValue))
                {
                    timestamp = DateTimeOffset.FromUnixTimeMilliseconds(tsValue).UtcDateTime;
                }

                // Parse GPS coordinates from "latlng" field (format: "lat,lng")
                double? latitude = null;
                double? longitude = null;
                if (dataElement.TryGetProperty("latlng", out var latlngElement) && latlngElement.ValueKind == JsonValueKind.String)
                {
                    var latlngStr = latlngElement.GetString();
                    if (!string.IsNullOrEmpty(latlngStr))
                    {
                        var parts = latlngStr.Split(',');
                        if (parts.Length == 2)
                        {
                            if (double.TryParse(parts[0], out var lat))
                                latitude = lat;
                            if (double.TryParse(parts[1], out var lng))
                                longitude = lng;
                        }
                    }
                }

                // Parse ignition status from field "239"
                bool? ignition = null;
                if (dataElement.TryGetProperty("239", out var ignitionElement) && ignitionElement.TryGetInt32(out var ignitionValue))
                {
                    ignition = ignitionValue > 0;
                }

                // Parse movement status from field "240"
                bool? movement = null;
                if (dataElement.TryGetProperty("240", out var movementElement) && movementElement.TryGetInt32(out var movementValue))
                {
                    movement = movementValue > 0;
                }

                // Parse battery voltage from field "66" and divide by 1000
                double? batteryVoltage = null;
                var rawBatteryVoltage = GetJsonDouble(dataElement, "66");
                if (rawBatteryVoltage.HasValue)
                {
                    batteryVoltage = rawBatteryVoltage.Value / 1000.0;
                }

                // Parse unit battery voltage from field "67" and divide by 1000
                double? unitBatteryVoltage = null;
                var rawUnitBatteryVoltage = GetJsonDouble(dataElement, "67");
                if (rawUnitBatteryVoltage.HasValue)
                {
                    unitBatteryVoltage = rawUnitBatteryVoltage.Value / 1000.0;
                }

                return new VehicleDataMessage
                {
                    IMEI = imei,
                    Timestamp = timestamp,
                    RawPayload = payload,
                    Latitude = latitude,
                    Longitude = longitude,
                    Speed = GetJsonDouble(dataElement, "sp"),
                    Heading = GetJsonDouble(dataElement, "ang"),
                    Altitude = GetJsonDouble(dataElement, "alt"),
                    Satellites = GetJsonInt(dataElement, "sat"),
                    HDOP = GetJsonDouble(dataElement, "hdop"),
                    BatteryVoltage = batteryVoltage,
                    UnitBatteryVoltage = unitBatteryVoltage,
                    Temperature = GetJsonDouble(dataElement, "temp"),
                    Odometer = GetJsonDouble(dataElement, "odometer") ?? GetJsonDouble(dataElement, "mileage"),
                    Ignition = ignition,
                    EventCode = GetJsonInt(dataElement, "evt"),
                    Priority = GetJsonInt(dataElement, "pr"),
                    RPM = GetJsonDouble(dataElement, "rpm"),
                    Distance = GetJsonDouble(dataElement, "distance"),
                    Movement = movement
                };
            }
            catch (JsonException)
            {
                // If not valid JSON, create a basic message with raw payload
                return new VehicleDataMessage
                {
                    IMEI = imei,
                    Timestamp = DateTime.UtcNow,
                    RawPayload = payload
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error parsing vehicle data for IMEI {imei}");
                return null;
            }
        }

        private double? GetJsonDouble(JsonElement element, string propertyName)
        {
            if (element.TryGetProperty(propertyName, out var prop) && prop.TryGetDouble(out var value))
                return value;
            return null;
        }

        private int? GetJsonInt(JsonElement element, string propertyName)
        {
            if (element.TryGetProperty(propertyName, out var prop) && prop.TryGetInt32(out var value))
                return value;
            return null;
        }

        private X509Certificate2 LoadClientCertificate(string certPath, string keyPath)
        {
            try
            {
                _logger.LogInformation($"Loading client certificate from {certPath} and key from {keyPath}");
                
                // Read certificate and key files
                var certContent = File.ReadAllText(certPath);
                var keyContent = File.ReadAllText(keyPath);

                // Create certificate with private key
                var cert = X509Certificate2.CreateFromPem(certContent, keyContent);
                
                // Verify the certificate has a private key
                if (!cert.HasPrivateKey)
                {
                    throw new InvalidOperationException("Certificate does not have a private key");
                }
                
                _logger.LogInformation($"Successfully loaded certificate: Subject={cert.Subject}, HasPrivateKey={cert.HasPrivateKey}");
                
                return cert;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to load client certificate from {CertPath} and {KeyPath}", certPath, keyPath);
                throw;
            }
        }

        public void Dispose()
        {
            if (!_disposed)
            {
                _mqttClient?.Dispose();
                _disposed = true;
            }
        }
    }

    public class VehicleDataMessage
    {
        public string IMEI { get; set; } = string.Empty;
        public DateTime Timestamp { get; set; }
        public string RawPayload { get; set; } = string.Empty;
        public double? Latitude { get; set; }
        public double? Longitude { get; set; }
        public double? Speed { get; set; }
        public double? Heading { get; set; }
        public double? Altitude { get; set; }
        public int? Satellites { get; set; }
        public double? HDOP { get; set; }
        public double? BatteryVoltage { get; set; }
        public double? UnitBatteryVoltage { get; set; }
        public double? Temperature { get; set; }
        public double? Odometer { get; set; }
        public bool? Ignition { get; set; }
        public int? EventCode { get; set; }
        public int? Priority { get; set; }
        public double? RPM { get; set; }
        public double? Distance { get; set; }
        public bool? Movement { get; set; }
    }
}
