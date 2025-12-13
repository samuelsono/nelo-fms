import { useEffect, useState } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";

interface TelemetryPoint {
  time: string;
  value: number;
}

interface TelemetryChartProps {
  deviceId: string;
  field: string;
  timespan?: string;
  title?: string;
  unit?: string;
  color?: string;
  chartType?: 'line' | 'area' | 'column';
  scaleFactor?: number; // Divide raw value by this to get actual value
}

export default function TelemetryChart({ 
  deviceId, 
  field, 
  timespan = "1h",
  title,
  unit = "",
  color = "#1e88e5",
  chartType = 'line',
  scaleFactor = 1
}: TelemetryChartProps) {
  const [chartOptions, setChartOptions] = useState<Highcharts.Options>({
    chart: {
      type: chartType === 'line' ? "spline" : chartType === 'area' ? "areaspline" : "column",
      height: null,
      backgroundColor: "transparent",
      spacing: [5, 5, 5, 5],
      margin: [10, 10, 30, 50],
    },
    title: {
      text: title,
      style: {
        fontSize: '12px',
        fontWeight: 'bold'
      }
    },
    xAxis: {
      visible: true,
      type: 'datetime',
      labels: {
        enabled: true,
        format: '{value:%H:%M}',
        style: {
          fontSize: '10px',
          color: '#666'
        }
      },
      tickInterval: 30 * 60 * 1000, // 30 minutes in milliseconds
      gridLineWidth: 0.8,
      gridLineColor: '#e0e0e0'
    },
    yAxis: {
      visible: true,
      min: 0,
      startOnTick: false,
      endOnTick: false,
      labels: {
        enabled: true,
        format: `{value}${unit ? ' ' + unit : ''}`,
        style: {
          fontSize: '10px',
          color: '#666'
        }
      },
      gridLineWidth: 0.8,
      gridLineColor: '#e0e0e0',
      title: {
        text: undefined
      }
    },
    legend: {
      enabled: false
    },
    credits: {
      enabled: false
    },
    tooltip: {
      headerFormat: "",
      pointFormat: `<b>{point.y:.1f}${unit ? ' ' + unit : ''}</b><br/>{point.x:%H:%M:%S}`
    },
    plotOptions: {
      spline: {
        lineWidth: 1.5,
        marker: {
          enabled: false,
          states: {
            hover: {
              enabled: true,
              radius: 4
            }
          }
        }
      },
      areaspline: {
        lineWidth: 1.5,
        fillOpacity: 0.3,
        marker: {
          enabled: false,
          states: {
            hover: {
              enabled: true,
              radius: 4
            }
          }
        }
      },
      column: {
        borderWidth: 0
      }
    },
    series: [{
      type: chartType === 'line' ? "spline" : chartType === 'area' ? "areaspline" : "column",
      name: title || field,
      data: [],
      color: color
    }]
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!deviceId || !field) return;

    setLoading(true);
    setError(null);

    fetch(`http://localhost:5108/api/telemetry/data?deviceId=${deviceId}&field=${field}&timespan=${timespan}`)
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data: TelemetryPoint[]) => {
        if (data.length === 0) {
          setError("No data available");
          setLoading(false);
          return;
        }

        // Convert data to Highcharts format with datetime and apply scaling
        const seriesData = data.map(point => ({
          x: new Date(point.time).getTime(),
          y: point.value / scaleFactor
        }));
        
        // Calculate min and max values from scaled data
        const values = data.map(point => point.value / scaleFactor);
        const minValue = Math.min(...values);
        const maxValue = Math.max(...values);
        
        setChartOptions({
          ...chartOptions,
          yAxis: {
            ...chartOptions.yAxis,
            min: minValue > 0 ? minValue * 0.95 : 0,
            max: maxValue * 1.10,
          },
          series: [{
            type: chartType === 'line' ? "spline" : chartType === 'area' ? "areaspline" : "column",
            name: title || field,
            data: seriesData,
            color: color
          }]
        });
        setLoading(false);
      })
      .catch(err => {
        console.error(`Error fetching ${field} data:`, err);
        setError(err.message);
        setLoading(false);
      });
  }, [deviceId, field, timespan]);

  if (loading) {
    return <div className="p-4 text-center text-sm text-gray-500">Loading {title || field} data...</div>;
  }

  if (error) {
    return <div className="p-4 text-center text-sm text-red-500">Error: {error}</div>;
  }

  const hasData = chartOptions.series && 
                  chartOptions.series.length > 0 && 
                  (chartOptions.series[0] as any).data.length > 0;

  if (!hasData) {
    return <div className="p-4 text-center text-sm text-gray-500">No {title || field} data available</div>;
  }

  return (
    <div className="w-full h-full">
      <HighchartsReact
        highcharts={Highcharts}
        options={chartOptions}
        containerProps={{ style: { height: "170px", width: "100%", overflow: "hidden" } }}
      />
    </div>
  );
}
