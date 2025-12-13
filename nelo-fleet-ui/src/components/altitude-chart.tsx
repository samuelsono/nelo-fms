import { useEffect, useState } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";

interface TelemetryPoint {
  time: string;
  value: number;
}

export default function AltitudeChart({ deviceId }: { deviceId: string }) {
  const [chartOptions, setChartOptions] = useState<Highcharts.Options>({
    chart: {
      type: "spline",
      height: null,
      backgroundColor: "transparent",
      spacing: [5, 5, 5, 5],
      margin: [10, 10, 30, 50],
    },
    title: {
      text: undefined
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
        format: '{value}',
        style: {
          fontSize: '10px',
          color: '#666'
        }
      },
      gridLineWidth: 0.8,
      gridLineColor: '#e0e0e0',
      title: {
        text: undefined
      },
      plotLines: [
        {
          value: 0,
          color: '#e0e0e0',
          width: 1,
          zIndex: 2,
          label: {
            text: 'Min',
            align: 'right',
            style: {
              color: '#666',
              fontSize: '10px'
            }
          }
        }
      ]
    },
    legend: {
      enabled: false
    },
    credits: {
      enabled: false
    },
    tooltip: {
      headerFormat: "",
      pointFormat: "<b>{point.y:.1f} km/h</b><br/>{point.category}"
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
      }
    },
    series: [{
      type: "spline",
      name: "Speed",
      data: [],
      color: "#1e88e5"
    }]
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!deviceId) return;

    setLoading(true);
    setError(null);

    fetch(`http://localhost:5108/api/telemetry/data?deviceId=${deviceId}&field=alt&timespan=6h`)
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data: TelemetryPoint[]) => {
        // Convert data to Highcharts format with datetime
        const seriesData = data.map(point => ({
          x: new Date(point.time).getTime(),
          y: point.value
        }));
        
        // Calculate min and max values
        const values = data.map(point => point.value);
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
            type: "spline",
            name: "Altitude (m)",
            data: seriesData,
            color: "#1e88e5"
          }]
        });
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching speed data:", err);
        setError(err.message);
        setLoading(false);
      });
  }, [deviceId]);

  if (loading) {
    return <div className="p-4 text-center">Loading speed data...</div>;
  }

  if (error) {
    return <div className="p-4 text-center text-red-500">Error: {error}</div>;
  }

  const hasData = chartOptions.series && 
                  chartOptions.series.length > 0 && 
                  (chartOptions.series[0] as any).data.length > 0;

  if (!hasData) {
    return <div className="p-4 text-center text-gray-500">No speed data available</div>;
  }

  return (
    <div className="w-full h-50">
      <HighchartsReact
        highcharts={Highcharts}
        options={chartOptions}
        containerProps={{ style: { height: "170px", width: "100%", overflow: "hidden" } }}
      />
    </div>
  );
}
