import { lazy, Suspense } from 'react';
import type { ChartBlock } from '@doku/application';

interface ChartRendererProps {
  block: ChartBlock;
  fallbackLabel: string;
}

// Recharts is heavy; lazy-load it so unit tests and first paint stay fast.
const ChartCanvas = lazy(async () => {
  const recharts = await import('recharts');
  const {
    Bar,
    BarChart,
    Line,
    LineChart,
    Area,
    AreaChart,
    Pie,
    PieChart,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    CartesianGrid,
    ResponsiveContainer,
    Cell,
  } = recharts;

  const COLOR_PALETTE = [
    '#00A3EE',
    '#FF6B6B',
    '#4CAF50',
    '#FFC107',
    '#9C27B0',
    '#FF9800',
    '#03A9F4',
    '#8BC34A',
  ];

  return {
    default: function ChartCanvasInner({ block }: { block: ChartBlock }) {
      const { chartType, xKey, yKeys, data, title } = block;

      const renderChart = () => {
        if (chartType === 'bar') {
          return (
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xKey} />
              <YAxis />
              <Tooltip />
              <Legend />
              {yKeys.map((key, index) => (
                <Bar key={key} dataKey={key} fill={COLOR_PALETTE[index % COLOR_PALETTE.length]} />
              ))}
            </BarChart>
          );
        }
        if (chartType === 'line') {
          return (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xKey} />
              <YAxis />
              <Tooltip />
              <Legend />
              {yKeys.map((key, index) => (
                <Line
                  key={key}
                  dataKey={key}
                  type="monotone"
                  stroke={COLOR_PALETTE[index % COLOR_PALETTE.length]}
                  dot
                />
              ))}
            </LineChart>
          );
        }
        if (chartType === 'area') {
          return (
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xKey} />
              <YAxis />
              <Tooltip />
              <Legend />
              {yKeys.map((key, index) => (
                <Area
                  key={key}
                  dataKey={key}
                  type="monotone"
                  stroke={COLOR_PALETTE[index % COLOR_PALETTE.length]}
                  fill={COLOR_PALETTE[index % COLOR_PALETTE.length]}
                  fillOpacity={0.2}
                />
              ))}
            </AreaChart>
          );
        }
        // pie
        const dataKey = yKeys[0];
        return (
          <PieChart>
            <Tooltip />
            <Legend />
            <Pie data={data} dataKey={dataKey} nameKey={xKey} outerRadius={120} label>
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLOR_PALETTE[index % COLOR_PALETTE.length]} />
              ))}
            </Pie>
          </PieChart>
        );
      };

      return (
        <figure className="visual-block visual-block--chart">
          {title ? <figcaption className="visual-block__chart-title">{title}</figcaption> : null}
          <div className="visual-block__chart-canvas" style={{ width: '100%', height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              {renderChart()}
            </ResponsiveContainer>
          </div>
        </figure>
      );
    },
  };
});

export function ChartRenderer({ block, fallbackLabel }: ChartRendererProps) {
  return (
    <Suspense
      fallback={
        <div
          className="visual-block visual-block--chart visual-block--loading"
          aria-label={fallbackLabel}
          data-testid="chart-renderer-loading"
        >
          {fallbackLabel}
        </div>
      }
    >
      <ChartCanvas block={block} />
    </Suspense>
  );
}
