import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Typography } from '@mui/material';
import type { PerfDataPoint } from '../types/app';

export type MetricKey = Exclude<keyof PerfDataPoint, 'time'>;

export interface MetricLine {
  dataKey: MetricKey;
  name: string;
  stroke: string;
}

interface MetricChartProps {
  title: string;
  data: PerfDataPoint[];
  unit: string;
  tooltipFormatter: (value: unknown) => string;
  lines: readonly MetricLine[];
}

export function MetricChart({
  title,
  data,
  unit,
  tooltipFormatter,
  lines,
}: MetricChartProps) {
  return (
    <>
      <Typography variant="caption" color="text.secondary" sx={{ pl: 0.5, lineHeight: 1.2 }}>
        {title}
      </Typography>
      <ResponsiveContainer width="100%" height={60}>
        <LineChart data={data} margin={{ top: 2, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
          <XAxis dataKey="time" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 9 }} domain={[0, 'auto']} unit={unit} />
          <Tooltip
            contentStyle={{ backgroundColor: '#1e1e1e', border: '1px solid #444', fontSize: 11 }}
            formatter={(value: unknown) => [tooltipFormatter(value)]}
          />
          {lines.map((line) => (
            <Line
              key={line.dataKey}
              type="monotone"
              dataKey={line.dataKey}
              name={line.name}
              stroke={line.stroke}
              dot={false}
              strokeWidth={1.5}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </>
  );
}
