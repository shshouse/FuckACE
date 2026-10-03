import { invoke } from '@tauri-apps/api/core';
import type { PerfDataPoint, SystemInfo } from '../types/app';

//用canvas生成性能报告，渲染为png格式并保存在桌面
interface SavePerformanceReportParams {
  data: PerfDataPoint[];
  systemInfo: SystemInfo | null;
}

interface MetricSummary {
  average: number;
  p95: number;
  peak: number;
  sampleCount: number;
}

interface PerformanceScoreSummary {
  totalScore: number;
  grade: string;
  reliability: string;
  effectiveSamples: number;
  cpuScore: number;
  memoryScore: number;
  ioScore: number;
  stabilityScore: number;
  cpuStats: MetricSummary;
  memoryStats: MetricSummary;
  ioStats: MetricSummary;
  cpuSpikeRatio: number;
  ioSpikeRatio: number;
}

function roundToSingle(value: number) {
  return Number(value.toFixed(1));
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function combineMetricValues(...values: Array<number | null>) {
  let total = 0;
  let hasValue = false;

  for (const value of values) {
    if (value === null || !Number.isFinite(value)) {
      continue;
    }

    total += value;
    hasValue = true;
  }

  return hasValue ? roundToSingle(total) : null;
}

function percentile(sortedValues: number[], ratio: number) {
  if (sortedValues.length === 0) {
    return 0;
  }

  const index = (sortedValues.length - 1) * ratio;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);

  if (lower === upper) {
    return sortedValues[lower];
  }

  const weight = index - lower;
  return sortedValues[lower] + (sortedValues[upper] - sortedValues[lower]) * weight;
}

function summarizeMetric(values: Array<number | null>): MetricSummary {
  const numericValues = values.filter((value): value is number => value !== null && Number.isFinite(value));

  if (numericValues.length === 0) {
    return {
      average: 0,
      p95: 0,
      peak: 0,
      sampleCount: 0,
    };
  }

  const sortedValues = [...numericValues].sort((left, right) => left - right);

  return {
    average: roundToSingle(numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length),
    p95: roundToSingle(percentile(sortedValues, 0.95)),
    peak: roundToSingle(sortedValues[sortedValues.length - 1]),
    sampleCount: numericValues.length,
  };
}

function calculateSpikeRatio(values: Array<number | null>, threshold: number) {
  const numericValues = values.filter((value): value is number => value !== null && Number.isFinite(value));

  if (numericValues.length === 0) {
    return 1;
  }

  const spikeCount = numericValues.filter((value) => value > threshold).length;
  return spikeCount / numericValues.length;
}

function interpolateScore(value: number, stops: Array<{ value: number; score: number }>) {
  if (value <= stops[0].value) {
    return clampScore(stops[0].score);
  }

  for (let index = 1; index < stops.length; index += 1) {
    const currentStop = stops[index];
    const previousStop = stops[index - 1];

    if (value <= currentStop.value) {
      const ratio = (value - previousStop.value) / (currentStop.value - previousStop.value);
      return clampScore(previousStop.score + ratio * (currentStop.score - previousStop.score));
    }
  }

  return clampScore(stops[stops.length - 1].score);
}

function getScoreGrade(score: number) {
  if (score >= 90) {
    return 'S';
  }

  if (score >= 80) {
    return 'A';
  }

  if (score >= 70) {
    return 'B';
  }

  if (score >= 60) {
    return 'C';
  }

  return 'D';
}

function getReliabilityLabel(sampleCount: number) {
  if (sampleCount >= 24) {
    return '高';
  }

  if (sampleCount >= 12) {
    return '中';
  }

  return '低';
}

function getScoreColor(score: number) {
  if (score >= 90) {
    return '#66bb6a';
  }

  if (score >= 80) {
    return '#42a5f5';
  }

  if (score >= 70) {
    return '#ffca28';
  }

  if (score >= 60) {
    return '#ff7043';
  }

  return '#ef5350';
}

function getGradeColor(grade: string) {
  switch (grade) {
    case 'S':
      return '#66bb6a';
    case 'A':
      return '#42a5f5';
    case 'B':
      return '#ffca28';
    case 'C':
      return '#ff7043';
    default:
      return '#ef5350';
  }
}

function formatMetricValue(value: number, unit: string) {
  return unit === '%' ? `${value.toFixed(1)}%` : `${value.toFixed(1)} ${unit}`;
}

function formatRatio(value: number) {
  return `${(value * 100).toFixed(0)}%`;
}

function calculatePerformanceScore(data: PerfDataPoint[]): PerformanceScoreSummary {
  const totalCpuValues = data.map((point) =>
    combineMetricValues(point.sguard_cpu, point.sguardsvc_cpu, point.acetray_cpu, point.aceservice_cpu));
  const totalMemoryValues = data.map((point) =>
    combineMetricValues(point.sguard_mem, point.sguardsvc_mem, point.acetray_mem, point.aceservice_mem));
  const totalIoValues = data.map((point) =>
    combineMetricValues(point.sguard_io, point.sguardsvc_io, point.acetray_io, point.aceservice_io));

  const cpuStats = summarizeMetric(totalCpuValues);
  const memoryStats = summarizeMetric(totalMemoryValues);
  const ioStats = summarizeMetric(totalIoValues);

  const cpuSpikeRatio = calculateSpikeRatio(totalCpuValues, 20);
  const ioSpikeRatio = calculateSpikeRatio(totalIoValues, 1024);
  const stabilityPressure = cpuSpikeRatio * 0.6 + ioSpikeRatio * 0.4;

  const cpuScore = cpuStats.sampleCount > 0
    ? interpolateScore(cpuStats.p95, [
      { value: 5, score: 100 },
      { value: 10, score: 90 },
      { value: 15, score: 80 },
      { value: 25, score: 65 },
      { value: 40, score: 40 },
      { value: 100, score: 20 },
    ])
    : 20;

  const memoryScore = memoryStats.sampleCount > 0
    ? interpolateScore(memoryStats.average, [
      { value: 300, score: 100 },
      { value: 500, score: 90 },
      { value: 800, score: 75 },
      { value: 1200, score: 55 },
      { value: 1800, score: 35 },
      { value: 3000, score: 20 },
    ])
    : 20;

  const ioScore = ioStats.sampleCount > 0
    ? interpolateScore(ioStats.p95, [
      { value: 128, score: 100 },
      { value: 256, score: 90 },
      { value: 512, score: 75 },
      { value: 1024, score: 55 },
      { value: 2048, score: 35 },
      { value: 4096, score: 20 },
    ])
    : 20;

  const stabilityScore = interpolateScore(stabilityPressure, [
    { value: 0.05, score: 100 },
    { value: 0.1, score: 90 },
    { value: 0.2, score: 75 },
    { value: 0.35, score: 55 },
    { value: 0.5, score: 35 },
    { value: 1, score: 20 },
  ]);

  const totalScore = clampScore(
    cpuScore * 0.4
      + memoryScore * 0.25
      + ioScore * 0.2
      + stabilityScore * 0.15,
  );

  const effectiveSamples = Math.max(cpuStats.sampleCount, memoryStats.sampleCount, ioStats.sampleCount);

  return {
    totalScore,
    grade: getScoreGrade(totalScore),
    reliability: getReliabilityLabel(effectiveSamples),
    effectiveSamples,
    cpuScore,
    memoryScore,
    ioScore,
    stabilityScore,
    cpuStats,
    memoryStats,
    ioStats,
    cpuSpikeRatio,
    ioSpikeRatio,
  };
}

export async function savePerformanceReport({
  data,
  systemInfo,
}: SavePerformanceReportParams): Promise<string> {
  const width = 1400;
  const padding = 50;
  const chartWidth = width - padding * 2;
  const chartHeight = 200;
  const chartGap = 80;
  const headerHeight = 250;
  const totalHeight = headerHeight + 3 * (chartHeight + chartGap) + padding;
  const scoreSummary = calculatePerformanceScore(data);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = totalHeight;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('无法初始化报告画布');
  }
  context.fillStyle = '#121212';
  context.fillRect(0, 0, width, totalHeight);
  const logo = await new Promise<HTMLImageElement>((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(image);
    image.src = '/logo.png';
  });
  const title = 'FuckACE 性能监控报告';
  const logoSize = 36;
  context.font = 'bold 26px sans-serif';
  const titleWidth = context.measureText(title).width;
  const headerWidth = logoSize + 12 + titleWidth;
  const headerStartX = (width - headerWidth) / 2;
  if (logo.complete && logo.naturalWidth > 0) {
    context.drawImage(logo, headerStartX, 18, logoSize, logoSize);
  }
  context.fillStyle = '#90caf9';
  context.textAlign = 'left';
  context.fillText(title, headerStartX + logoSize + 12, 46);
  context.fillStyle = 'rgba(255,255,255,0.6)';
  context.font = '14px sans-serif';
  context.textAlign = 'center';
  const totalSeconds = data.length * 5;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const durationText = minutes > 0 ? `${minutes}分${seconds}秒` : `${seconds}秒`;
  context.fillText(
    `生成时间: ${new Date().toLocaleString('zh-CN')}  |  数据点: ${data.length}  |  监控时长: ${durationText}  |  CPU: ${systemInfo?.cpu_model || 'N/A'}`,
    width / 2,
    76,
  );
  context.fillText(
    `系统: ${systemInfo?.os_name || ''} ${systemInfo?.os_version || ''}  |  内存: ${systemInfo?.total_memory_gb?.toFixed(1) || 'N/A'} GB  |  权限: ${systemInfo?.is_admin ? '管理员' : '普通用户'}`,
    width / 2,
    100,
  );

  const scoreCardY = 122;
  const scoreCardHeight = 104;
  const scoreCardGap = 14;
  const overallCardWidth = 240;
  const detailCardWidth = (chartWidth - overallCardWidth - scoreCardGap * 4) / 4;

  const drawCard = (
    x: number,
    y: number,
    widthValue: number,
    heightValue: number,
    fillStyle: string,
  ) => {
    context.fillStyle = fillStyle;
    context.fillRect(x, y, widthValue, heightValue);
    context.strokeStyle = 'rgba(255,255,255,0.12)';
    context.lineWidth = 1;
    context.strokeRect(x, y, widthValue, heightValue);
  };

  const drawMetricCard = (
    x: number,
    label: string,
    score: number,
    line1: string,
    line2: string,
  ) => {
    drawCard(x, scoreCardY, detailCardWidth, scoreCardHeight, '#171b25');
    context.fillStyle = 'rgba(255,255,255,0.68)';
    context.font = '13px sans-serif';
    context.textAlign = 'left';
    context.fillText(label, x + 16, scoreCardY + 24);
    context.fillStyle = getScoreColor(score);
    context.font = 'bold 30px sans-serif';
    context.fillText(String(score), x + 16, scoreCardY + 62);
    context.fillStyle = 'rgba(255,255,255,0.78)';
    context.font = '12px sans-serif';
    context.fillText(line1, x + 16, scoreCardY + 84);
    context.fillText(line2, x + 16, scoreCardY + 100);
  };

  drawCard(padding, scoreCardY, overallCardWidth, scoreCardHeight, '#17212b');
  context.fillStyle = 'rgba(255,255,255,0.7)';
  context.font = '14px sans-serif';
  context.textAlign = 'left';
  context.fillText('综合评分', padding + 18, scoreCardY + 26);
  context.fillStyle = getGradeColor(scoreSummary.grade);
  context.font = 'bold 54px sans-serif';
  context.fillText(String(scoreSummary.totalScore), padding + 18, scoreCardY + 78);
  context.fillStyle = getGradeColor(scoreSummary.grade);
  context.fillRect(padding + overallCardWidth - 74, scoreCardY + 16, 52, 26);
  context.fillStyle = '#0f1117';
  context.font = 'bold 16px sans-serif';
  context.textAlign = 'center';
  context.fillText(scoreSummary.grade, padding + overallCardWidth - 48, scoreCardY + 34);
  context.fillStyle = 'rgba(255,255,255,0.78)';
  context.font = '12px sans-serif';
  context.textAlign = 'left';
  context.fillText(
    `${scoreSummary.reliability}可信度 · ${scoreSummary.effectiveSamples}个有效采样点`,
    padding + 18,
    scoreCardY + 98,
  );

  const detailStartX = padding + overallCardWidth + scoreCardGap;
  drawMetricCard(
    detailStartX,
    'CPU 得分',
    scoreSummary.cpuScore,
    `P95 ${formatMetricValue(scoreSummary.cpuStats.p95, '%')}`,
    `峰值 ${formatMetricValue(scoreSummary.cpuStats.peak, '%')}`,
  );
  drawMetricCard(
    detailStartX + detailCardWidth + scoreCardGap,
    '内存得分',
    scoreSummary.memoryScore,
    `均值 ${formatMetricValue(scoreSummary.memoryStats.average, 'MB')}`,
    `P95 ${formatMetricValue(scoreSummary.memoryStats.p95, 'MB')}`,
  );
  drawMetricCard(
    detailStartX + (detailCardWidth + scoreCardGap) * 2,
    'I/O 得分',
    scoreSummary.ioScore,
    `P95 ${formatMetricValue(scoreSummary.ioStats.p95, 'KB/s')}`,
    `峰值 ${formatMetricValue(scoreSummary.ioStats.peak, 'KB/s')}`,
  );
  drawMetricCard(
    detailStartX + (detailCardWidth + scoreCardGap) * 3,
    '稳定性得分',
    scoreSummary.stabilityScore,
    `CPU尖峰 ${formatRatio(scoreSummary.cpuSpikeRatio)}`,
    `I/O尖峰 ${formatRatio(scoreSummary.ioSpikeRatio)}`,
  );

  const drawChart = (
    yOffset: number,
    titleText: string,
    unit: string,
    series: Array<{ values: Array<number | null>; color: string; label: string }>,
  ) => {
    const originX = padding;

    context.fillStyle = 'rgba(255,255,255,0.85)';
    context.font = 'bold 14px sans-serif';
    context.textAlign = 'left';
    context.fillText(titleText, originX, yOffset - 10);

    context.fillStyle = '#1e1e1e';
    context.fillRect(originX, yOffset, chartWidth, chartHeight);

    context.strokeStyle = 'rgba(255,255,255,0.15)';
    context.lineWidth = 1;
    context.strokeRect(originX, yOffset, chartWidth, chartHeight);

    context.strokeStyle = 'rgba(255,255,255,0.06)';
    for (let index = 1; index < 4; index += 1) {
      const gridY = yOffset + (chartHeight / 4) * index;
      context.beginPath();
      context.moveTo(originX, gridY);
      context.lineTo(originX + chartWidth, gridY);
      context.stroke();
    }

    let maxValue = 0;
    for (const item of series) {
      for (const value of item.values) {
        if (value !== null && value > maxValue) {
          maxValue = value;
        }
      }
    }

    if (maxValue === 0) {
      maxValue = 1;
    }

    maxValue *= 1.15;

    context.fillStyle = 'rgba(255,255,255,0.5)';
    context.font = '10px sans-serif';
    context.textAlign = 'right';

    for (let index = 0; index <= 4; index += 1) {
      context.fillText(
        `${((maxValue / 4) * (4 - index)).toFixed(1)}${unit}`,
        originX - 5,
        yOffset + (chartHeight / 4) * index + 4,
      );
    }

    context.textAlign = 'center';
    const tickStep = Math.max(1, Math.floor(data.length / 10));
    for (let index = 0; index < data.length; index += tickStep) {
      context.fillText(
        data[index].time,
        originX + (index / Math.max(1, data.length - 1)) * chartWidth,
        yOffset + chartHeight + 14,
      );
    }

    for (const item of series) {
      context.beginPath();
      context.strokeStyle = item.color;
      context.lineWidth = 1.5;

      let started = false;
      for (let index = 0; index < item.values.length; index += 1) {
        const value = item.values[index];

        if (value === null) {
          started = false;
          continue;
        }

        const x = originX + (index / Math.max(1, data.length - 1)) * chartWidth;
        const y = yOffset + chartHeight - (value / maxValue) * chartHeight;

        if (!started) {
          context.moveTo(x, y);
          started = true;
        } else {
          context.lineTo(x, y);
        }
      }

      context.stroke();
    }

    let legendX = originX + chartWidth - series.length * 110;
    for (const item of series) {
      context.fillStyle = item.color;
      context.fillRect(legendX, yOffset - 14, 10, 10);
      context.fillStyle = 'rgba(255,255,255,0.7)';
      context.font = '11px sans-serif';
      context.textAlign = 'left';
      context.fillText(item.label, legendX + 14, yOffset - 5);
      legendX += 110;
    }
  };

  const firstChartY = headerHeight;

  drawChart(firstChartY, 'CPU 占用 (%)', '%', [
    { values: data.map((point) => point.sguard_cpu), color: '#f44336', label: 'SGuard64' },
    { values: data.map((point) => point.sguardsvc_cpu), color: '#ff9800', label: 'SGuardSvc64' },
    { values: data.map((point) => point.acetray_cpu), color: '#42a5f5', label: 'ACE-Tray' },
    { values: data.map((point) => point.aceservice_cpu), color: '#ab47bc', label: 'ACE-Service64' },
  ]);

  drawChart(firstChartY + chartHeight + chartGap, '内存占用 (MB)', ' MB', [
    { values: data.map((point) => point.sguard_mem), color: '#f44336', label: 'SGuard64' },
    { values: data.map((point) => point.sguardsvc_mem), color: '#ff9800', label: 'SGuardSvc64' },
    { values: data.map((point) => point.acetray_mem), color: '#42a5f5', label: 'ACE-Tray' },
    { values: data.map((point) => point.aceservice_mem), color: '#ab47bc', label: 'ACE-Service64' },
  ]);

  drawChart(firstChartY + 2 * (chartHeight + chartGap), 'I/O 读写 (KB/s)', ' KB/s', [
    { values: data.map((point) => point.sguard_io), color: '#f44336', label: 'SGuard64' },
    { values: data.map((point) => point.sguardsvc_io), color: '#ff9800', label: 'SGuardSvc64' },
    { values: data.map((point) => point.acetray_io), color: '#42a5f5', label: 'ACE-Tray' },
    { values: data.map((point) => point.aceservice_io), color: '#ab47bc', label: 'ACE-Service64' },
  ]);

  const base64Data = canvas.toDataURL('image/png').split(',')[1];
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

  return invoke<string>('save_report_to_desktop', {
    imageBase64: base64Data,
    filename: `FuckACE_Report_${timestamp}.png`,
  });
}
