import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { SMIPAY_COLORS } from '../../constants/smipay';
import { formatMoney, formatNumber, formatWeekLabel } from '../../utils/format';
import { tooltipStyle } from './chartTheme';

const TrendChart = ({
  data,
  volumeKey = 'volume',
  countKey = 'transactions',
  volumeName = 'Volume',
  countName = 'Transactions',
  moneyVolume = true,
  weekLabels = false,
}) => {
  if (!data?.length) {
    return <p className="empty">No data for this period.</p>;
  }

  const tickFormatter = weekLabels
    ? (value) => formatWeekLabel(value, { short: true })
    : undefined;
  const labelFormatter = weekLabels
    ? (value) => formatWeekLabel(value)
    : undefined;

  return (
    <div className="chart-box">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid stroke="rgba(0,0,0,0.06)" vertical={false} />
          <XAxis
            dataKey="period"
            stroke="#6e6e73"
            fontSize={11}
            tickLine={false}
            tickFormatter={tickFormatter}
          />
          <YAxis
            yAxisId="left"
            stroke="#6e6e73"
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="#6e6e73"
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            labelFormatter={labelFormatter}
            formatter={(value, name) => {
              if (name === volumeName && moneyVolume) return formatMoney(value);
              return formatNumber(value);
            }}
          />
          <Legend />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey={volumeKey}
            stroke={SMIPAY_COLORS.orange}
            strokeWidth={2.25}
            dot={{ r: 3, fill: SMIPAY_COLORS.orange }}
            name={volumeName}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey={countKey}
            stroke={SMIPAY_COLORS.green}
            strokeWidth={2}
            name={countName}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TrendChart;
