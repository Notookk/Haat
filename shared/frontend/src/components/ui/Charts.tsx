import React, { useState, useRef, useId } from 'react';
import { clsx } from 'clsx';

// ============================================================================
// 1. TREND AREA CHART
// ============================================================================

export interface TrendDataPoint {
  label: string;
  value: number;
  secondaryValue?: number;
  date?: string;
}

export interface TrendAreaChartProps {
  title: string;
  subtitle?: string;
  badge?: {
    label: string;
    tone?: 'positive' | 'negative' | 'warning' | 'neutral';
  };
  data: TrendDataPoint[];
  primaryLabel?: string;
  secondaryLabel?: string;
  valueFormatter?: (val: number) => string;
  secondaryValueFormatter?: (val: number) => string;
  primaryColor?: string;
  secondaryColor?: string;
  ranges?: string[];
  selectedRange?: string;
  onRangeChange?: (range: string) => void;
  height?: number;
  svgWidth?: number;
  className?: string;
  emptyMessage?: string;
  headerAction?: React.ReactNode;
}

function createCurvedPath(points: Array<[number, number]>): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0][0]} ${points[0][1]}`;
  if (points.length === 2) {
    return `M ${points[0][0]} ${points[0][1]} L ${points[1][0]} ${points[1][1]}`;
  }

  let d = `M ${points[0][0].toFixed(1)} ${points[0][1].toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}

export function TrendAreaChart({
  title,
  subtitle,
  badge,
  data,
  primaryLabel = 'Value',
  secondaryLabel,
  valueFormatter = (v) => v.toLocaleString('en-IN'),
  secondaryValueFormatter = (v) => v.toLocaleString('en-IN'),
  primaryColor = '#16135c',
  secondaryColor = '#10b981',
  ranges,
  selectedRange,
  onRangeChange,
  height = 160,
  svgWidth = 800,
  className,
  emptyMessage = 'No activity recorded yet',
  headerAction,
}: TrendAreaChartProps) {
  const gradientId = useId();
  const secondaryGradientId = useId();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const hasData = data && data.length > 0;
  const values = hasData ? data.map((d) => d.value) : [0];
  const secondaryValues = hasData && secondaryLabel ? data.map((d) => d.secondaryValue ?? 0) : [];

  const maxVal = Math.max(...values, ...(secondaryValues.length > 0 ? secondaryValues : [0]), 1);
  const yTicksCount = 3;
  const yMax = Math.ceil(maxVal * 1.15) || 10;
  const yTicks = Array.from({ length: yTicksCount }, (_, i) => Math.round((yMax / (yTicksCount - 1)) * i));

  const svgHeight = height;
  const paddingLeft = 46;
  const paddingRight = 16;
  const paddingTop = 16;
  const paddingBottom = 26;

  const chartW = svgWidth - paddingLeft - paddingRight;
  const chartH = svgHeight - paddingTop - paddingBottom;

  const points: Array<[number, number]> = hasData
    ? data.map((d, i) => {
        const x = paddingLeft + (i / Math.max(1, data.length - 1)) * chartW;
        const normalizedY = 1 - d.value / yMax;
        const y = paddingTop + normalizedY * chartH;
        return [x, y];
      })
    : [];

  const secondaryPoints: Array<[number, number]> =
    hasData && secondaryLabel
      ? data.map((d, i) => {
          const x = paddingLeft + (i / Math.max(1, data.length - 1)) * chartW;
          const normalizedY = 1 - (d.secondaryValue ?? 0) / yMax;
          const y = paddingTop + normalizedY * chartH;
          return [x, y];
        })
      : [];

  const linePath = createCurvedPath(points);
  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1][0].toFixed(1)} ${(paddingTop + chartH).toFixed(1)} L ${points[0][0].toFixed(1)} ${(paddingTop + chartH).toFixed(1)} Z`
      : '';

  const secondaryLinePath = createCurvedPath(secondaryPoints);
  const secondaryAreaPath =
    secondaryPoints.length > 0
      ? `${secondaryLinePath} L ${secondaryPoints[secondaryPoints.length - 1][0].toFixed(1)} ${(paddingTop + chartH).toFixed(1)} L ${secondaryPoints[0][0].toFixed(1)} ${(paddingTop + chartH).toFixed(1)} Z`
      : '';

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!hasData || !containerRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const ratio = (clientX - (paddingLeft / svgWidth) * rect.width) / ((chartW / svgWidth) * rect.width);
    const clampedRatio = Math.max(0, Math.min(1, ratio));
    const index = Math.round(clampedRatio * (data.length - 1));
    setHoveredIndex(index);
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);
  };

  const activePoint = hoveredIndex !== null && data[hoveredIndex] ? data[hoveredIndex] : null;
  const activeCoord = hoveredIndex !== null && points[hoveredIndex] ? points[hoveredIndex] : null;
  const activeSecondaryCoord =
    hoveredIndex !== null && secondaryPoints[hoveredIndex] ? secondaryPoints[hoveredIndex] : null;

  return (
    <div
      ref={containerRef}
      className={clsx(
        'relative flex flex-col justify-between rounded-xl border border-line bg-surface p-4 shadow-card',
        className,
      )}
    >
      {/* Chart Header */}
      <div className="flex items-center justify-between gap-2 border-b border-line pb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-xs font-bold text-ink-900">{title}</h3>
            {badge && (
              <span
                className={clsx(
                  'shrink-0 rounded-full px-1.5 py-0.2 text-[10px] font-semibold',
                  badge.tone === 'positive' && 'bg-emerald-50 text-emerald-700',
                  badge.tone === 'warning' && 'bg-amber-50 text-amber-700',
                  badge.tone === 'negative' && 'bg-rose-50 text-rose-700',
                  (!badge.tone || badge.tone === 'neutral') && 'bg-surface-sunken text-ink-600',
                )}
              >
                {badge.label}
              </span>
            )}
          </div>
          {subtitle && <p className="truncate text-[11px] text-ink-500">{subtitle}</p>}
        </div>

        {/* Range or Custom Action */}
        <div className="flex shrink-0 items-center gap-2">
          {headerAction}
          {ranges && ranges.length > 0 && onRangeChange && (
            <div className="flex items-center rounded-md border border-line bg-surface-sunken p-0.5">
              {ranges.map((range) => (
                <button
                  key={range}
                  type="button"
                  onClick={() => onRangeChange(range)}
                  className={clsx(
                    'rounded px-1.5 py-0.5 text-[10px] font-semibold transition-colors',
                    selectedRange === range
                      ? 'bg-surface text-ink-900 shadow-2xs'
                      : 'text-ink-500 hover:text-ink-900',
                  )}
                >
                  {range}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative mt-2 w-full select-none" style={{ height }}>
        {!hasData ? (
          <div className="flex h-full items-center justify-center text-center">
            <p className="text-micro text-ink-400">{emptyMessage}</p>
          </div>
        ) : (
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="h-full w-full overflow-visible"
            preserveAspectRatio="none"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <defs>
              <linearGradient id={`area-grad-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={primaryColor} stopOpacity="0.25" />
                <stop offset="90%" stopColor={primaryColor} stopOpacity="0.01" />
              </linearGradient>
              {secondaryLabel && (
                <linearGradient id={`area-grad-sec-${secondaryGradientId}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={secondaryColor} stopOpacity="0.2" />
                  <stop offset="90%" stopColor={secondaryColor} stopOpacity="0.01" />
                </linearGradient>
              )}
            </defs>

            {/* Horizontal Grid lines */}
            {yTicks.map((tick, i) => {
              const y = paddingTop + (1 - tick / yMax) * chartH;
              return (
                <g key={i}>
                  <line
                    x1={paddingLeft}
                    y1={y}
                    x2={svgWidth - paddingRight}
                    y2={y}
                    stroke="currentColor"
                    className="text-line/80"
                    strokeDasharray={i === 0 ? undefined : '3 3'}
                    strokeWidth={1}
                  />
                  <text
                    x={paddingLeft - 6}
                    y={y + 3}
                    textAnchor="end"
                    className="fill-ink-400 text-[9px] font-mono"
                  >
                    {tick >= 1000 ? `${(tick / 1000).toFixed(0)}k` : tick}
                  </text>
                </g>
              );
            })}

            {/* Secondary Area & Line */}
            {secondaryAreaPath && (
              <path d={secondaryAreaPath} fill={`url(#area-grad-sec-${secondaryGradientId})`} />
            )}
            {secondaryLinePath && (
              <path
                d={secondaryLinePath}
                fill="none"
                stroke={secondaryColor}
                strokeWidth={1.75}
                strokeDasharray="3 3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Primary Area & Line */}
            {areaPath && <path d={areaPath} fill={`url(#area-grad-${gradientId})`} />}
            {linePath && (
              <path
                d={linePath}
                fill="none"
                stroke={primaryColor}
                strokeWidth={2.25}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* X Axis Labels */}
            {points.map(([x], i) => {
              const total = points.length;
              const step = total > 8 ? Math.ceil(total / 4) : 2;
              if (i !== 0 && i !== total - 1 && i % step !== 0) return null;
              return (
                <text
                  key={i}
                  x={x}
                  y={svgHeight - 4}
                  textAnchor="middle"
                  className="fill-ink-400 text-[9px] font-medium"
                >
                  {data[i].label}
                </text>
              );
            })}

            {/* Hover Cursor & Dots */}
            {activeCoord && (
              <g>
                <line
                  x1={activeCoord[0]}
                  y1={paddingTop}
                  x2={activeCoord[0]}
                  y2={paddingTop + chartH}
                  stroke={primaryColor}
                  strokeWidth={1.25}
                  strokeDasharray="2 2"
                  className="opacity-70"
                />
                <circle
                  cx={activeCoord[0]}
                  cy={activeCoord[1]}
                  r={5}
                  fill={primaryColor}
                  stroke="#ffffff"
                  strokeWidth={2}
                />
                {activeSecondaryCoord && (
                  <circle
                    cx={activeSecondaryCoord[0]}
                    cy={activeSecondaryCoord[1]}
                    r={4}
                    fill={secondaryColor}
                    stroke="#ffffff"
                    strokeWidth={1.5}
                  />
                )}
              </g>
            )}
          </svg>
        )}

        {/* Floating Tooltip Card */}
        {activePoint && activeCoord && (
          <div
            className="pointer-events-none absolute z-20 rounded-md border border-line bg-surface/95 px-2.5 py-1.5 text-micro shadow-elevated backdrop-blur-xs transition-all"
            style={{
              left: Math.min(Math.max(10, (activeCoord[0] / svgWidth) * 100), 80) + '%',
              top: Math.max(10, (activeCoord[1] / svgHeight) * 100 - 25) + '%',
              transform: 'translate(-50%, -100%)',
            }}
          >
            <div className="font-semibold text-ink-900">{activePoint.label}</div>
            <div className="mt-0.5 space-y-0.5">
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: primaryColor }} />
                <span className="text-ink-600">{primaryLabel}:</span>
                <span className="font-bold text-ink-900">{valueFormatter(activePoint.value)}</span>
              </div>
              {secondaryLabel && (
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: secondaryColor }} />
                  <span className="text-ink-600">{secondaryLabel}:</span>
                  <span className="font-bold text-ink-900">
                    {secondaryValueFormatter(activePoint.secondaryValue ?? 0)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Legend Footer */}
      <div className="mt-2 flex items-center justify-between border-t border-line/60 pt-2 text-[10px] text-ink-500">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: primaryColor }} />
            {primaryLabel}
          </span>
          {secondaryLabel && (
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: secondaryColor }} />
              {secondaryLabel}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 2. DONUT DISTRIBUTION CHART
// ============================================================================

export interface DonutSegment {
  id?: string;
  label: string;
  value: number;
  color: string;
}

export interface DonutDistributionChartProps {
  title: string;
  subtitle?: string;
  totalLabel?: string;
  data: DonutSegment[];
  className?: string;
  emptyMessage?: string;
  onSelectSegment?: (segment: DonutSegment) => void;
  enableHover?: boolean;
}

export function DonutDistributionChart({
  title,
  subtitle,
  totalLabel = 'Total',
  data,
  className,
  emptyMessage = 'No data available',
  onSelectSegment,
  enableHover = false,
}: DonutDistributionChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const total = data.reduce((acc, curr) => acc + curr.value, 0);

  const size = 125;
  const strokeWidth = 18;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let cumulativePercent = 0;
  const activeHoverIndex = enableHover ? hoveredIndex : null;
  const hoveredSegment = activeHoverIndex !== null ? data[activeHoverIndex] : null;

  return (
    <div
      className={clsx(
        'flex flex-col justify-between rounded-xl border border-line bg-surface p-4 shadow-card',
        enableHover && 'transition-all hover:border-line-strong',
        className,
      )}
    >
      <div className="border-b border-line pb-3">
        <h3 className="truncate text-xs font-bold text-ink-900">{title}</h3>
        {subtitle && <p className="truncate text-[11px] text-ink-500">{subtitle}</p>}
      </div>

      {total === 0 ? (
        <div className="flex h-40 items-center justify-center text-center">
          <p className="text-micro text-ink-400">{emptyMessage}</p>
        </div>
      ) : (
        <div className="my-auto flex items-center justify-between gap-5 py-2">
          {/* Donut SVG */}
          <div className="relative flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rotate-[-90deg]">
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="currentColor"
                className="text-surface-sunken"
                strokeWidth={strokeWidth}
              />
              {data.map((segment, index) => {
                if (segment.value <= 0) return null;
                const percent = segment.value / total;
                const dashLength = percent * circumference;
                const dashOffset = -cumulativePercent * circumference;
                cumulativePercent += percent;

                const isHovered = activeHoverIndex === index;

                return (
                  <circle
                    key={segment.label}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={segment.color}
                    strokeWidth={isHovered ? strokeWidth + 3 : strokeWidth}
                    strokeDasharray={`${dashLength} ${circumference}`}
                    strokeDashoffset={dashOffset}
                    className={clsx(
                      onSelectSegment && 'cursor-pointer',
                      enableHover && 'cursor-pointer transition-all duration-150',
                    )}
                    onMouseEnter={enableHover ? () => setHoveredIndex(index) : undefined}
                    onMouseLeave={enableHover ? () => setHoveredIndex(null) : undefined}
                    onClick={() => onSelectSegment?.(segment)}
                  />
                );
              })}
            </svg>

            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-sm font-black text-ink-900">
                {hoveredSegment ? hoveredSegment.value.toLocaleString('en-IN') : total.toLocaleString('en-IN')}
              </span>
              <span className="text-[9px] font-semibold text-ink-400 uppercase tracking-wider">
                {hoveredSegment ? hoveredSegment.label : totalLabel}
              </span>
            </div>
          </div>

          {/* Slices Legend */}
          <div className="min-w-0 flex-1 space-y-2">
            {data.map((segment, index) => {
              const percent = total > 0 ? Math.round((segment.value / total) * 100) : 0;
              const isHovered = activeHoverIndex === index;

              return (
                <div
                  key={segment.label}
                  className={clsx(
                    'flex items-center justify-between rounded px-2.5 py-1.5',
                    enableHover && 'transition-all cursor-pointer',
                    enableHover && (isHovered ? 'bg-surface-sunken' : 'hover:bg-surface-sunken/60'),
                    onSelectSegment && 'cursor-pointer hover:bg-surface-sunken/60',
                  )}
                  onMouseEnter={enableHover ? () => setHoveredIndex(index) : undefined}
                  onMouseLeave={enableHover ? () => setHoveredIndex(null) : undefined}
                  onClick={() => onSelectSegment?.(segment)}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: segment.color }}
                    />
                    <span className="truncate text-label font-medium text-ink-700">{segment.label}</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono text-label font-bold text-ink-900">
                      {segment.value.toLocaleString('en-IN')}
                    </span>
                    <span className="text-micro font-semibold text-ink-400">
                      {percent}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer Info Strip */}
      <div className="mt-2 border-t border-line/60 pt-2 text-[10px] text-ink-500 flex items-center justify-between">
        <span className="truncate">Channel Distribution</span>
        <span className="font-medium text-ink-600 shrink-0">
          {total > 0 ? `${data.filter((d) => d.value > 0).length} active` : '0 active'}
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// 3. BAR COMPARISON CHART
// ============================================================================

export interface BarMetricItem {
  label: string;
  value: number;
  sublabel?: string;
  color?: string;
  badge?: string;
}

export interface BarComparisonChartProps {
  title: string;
  subtitle?: string;
  data: BarMetricItem[];
  valueFormatter?: (val: number) => string;
  className?: string;
  emptyMessage?: string;
  maxItems?: number;
}

export function BarComparisonChart({
  title,
  subtitle,
  data,
  valueFormatter = (v) => v.toLocaleString('en-IN'),
  className,
  emptyMessage = 'No comparative data recorded',
  maxItems = 4,
}: BarComparisonChartProps) {
  const displayData = data.slice(0, maxItems);
  const maxVal = Math.max(...displayData.map((d) => d.value), 1);

  return (
    <div
      className={clsx(
        'flex flex-col justify-between rounded-xl border border-line bg-surface p-4 shadow-card transition-all hover:border-line-strong',
        className,
      )}
    >
      <div className="border-b border-line pb-3">
        <h3 className="truncate text-xs font-bold text-ink-900">{title}</h3>
        {subtitle && <p className="truncate text-[11px] text-ink-500">{subtitle}</p>}
      </div>

      {displayData.length === 0 ? (
        <div className="flex h-40 items-center justify-center text-center">
          <p className="text-micro text-ink-400">{emptyMessage}</p>
        </div>
      ) : (
        <div className="mt-3 space-y-2.5">
          {displayData.map((item) => {
            const percentage = Math.round((item.value / maxVal) * 100);
            const barColor = item.color || '#16135c';

            return (
              <div key={item.label} className="group">
                <div className="flex items-center justify-between text-micro font-medium text-ink-800">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="truncate font-semibold">{item.label}</span>
                    {item.badge && (
                      <span className="rounded bg-surface-sunken px-1 py-0.2 text-[9px] font-semibold text-ink-500">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="font-mono text-ink-900 font-bold">{valueFormatter(item.value)}</span>
                    {item.sublabel && <span className="text-[10px] text-ink-400">({item.sublabel})</span>}
                  </div>
                </div>

                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-surface-sunken">
                  <div
                    className="h-full rounded-full transition-all duration-300 ease-out group-hover:brightness-110"
                    style={{
                      width: `${Math.max(4, percentage)}%`,
                      backgroundColor: barColor,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer info */}
      <div className="mt-2 border-t border-line/60 pt-2 text-[10px] text-ink-400 text-center">
        Top {displayData.length} distribution segments
      </div>
    </div>
  );
}
