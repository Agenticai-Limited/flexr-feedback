import React, { useState, useEffect } from 'react';
import {
  Table,
  Card,
  Typography,
  Alert,
  Spin,
  Button,
  DatePicker,
  Space,
  Row,
  Col,
  Statistic
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DownloadOutlined, FilePdfOutlined, StopOutlined, QuestionCircleOutlined, CalculatorOutlined, RiseOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ReactECharts from 'echarts-for-react';
import { NoResultSummary } from '../types';
import { noResultAPI } from '../services/api';

const { Title } = Typography;
const { RangePicker } = DatePicker;

type RangeValue = [Dayjs | null, Dayjs | null] | null;

const NoResultAnalysis: React.FC = () => {
  const [data, setData] = useState<NoResultSummary[]>([]);
  const [stats, setStats] = useState({
      totalQueries: 0,
      uniqueQueries: 0,
      avgOccurrence: 0,
      topQueryCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<RangeValue>(null);

  useEffect(() => {
    loadData();
  }, [dateRange]);

  const loadData = async () => {
    try {
      setLoading(true);
      const startDate = dateRange?.[0]?.startOf('day').toISOString();
      const endDate = dateRange?.[1]?.endOf('day').toISOString();
      const result = await noResultAPI.getSummary(1000, startDate, endDate); 
      
      setData(result);

      // Calculate stats
      const total = result.reduce((sum, item) => sum + item.count, 0);
      const unique = result.length;
      const topCount = result.length > 0 ? result[0].count : 0;
      setStats({
          totalQueries: total,
          uniqueQueries: unique,
          avgOccurrence: unique > 0 ? parseFloat((total / unique).toFixed(1)) : 0,
          topQueryCount: topCount,
      });

    } catch (err) {
      setError('Failed to load no-result data');
      console.error('No-result data loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (dates: RangeValue) => {
    setDateRange(dates);
  };

  const handleExportCsv = async () => {
    setExportingCsv(true);
    try {
      const exportData = data.map(item => ({
        Query: item.query,
        Count: item.count,
        'Last Occurred At': dayjs(item.last_occurred_at).format('YYYY-MM-DD HH:mm:ss'),
      }));

      const csv = Papa.unparse(exportData);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `no-result-export-${dayjs().format('YYYYMMDD')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (err) {
      setError('Failed to export CSV data.');
    } finally {
      setExportingCsv(false);
    }
  };

  const handleExportPdf = async () => {
    setExportingPdf(true);
    try {
      const doc = new jsPDF();
      const title = `No Result Analysis: ${dateRange?.[0]?.format('YYYY-MM-DD') || 'Start'} to ${dateRange?.[1]?.endOf('day').format('YYYY-MM-DD') || 'End'}`;
      doc.text(title, 14, 20);

      autoTable(doc, {
        startY: 25,
        head: [['Query', 'Count', 'Last Occurred At']],
        body: data.map(item => [
          item.query,
          item.count,
          dayjs(item.last_occurred_at).format('YYYY-MM-DD HH:mm:ss'),
        ]),
        theme: 'striped',
      });

      doc.save(`no-result-report-${dayjs().format('YYYYMMDD')}.pdf`);

    } catch (err) {
      setError('Failed to export PDF.');
    } finally {
      setExportingPdf(false);
    }
  };

  // Chart configuration for top no-result queries
  const barChartOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' }
    },
    xAxis: {
      type: 'category',
      data: data.slice(0, 15).map(item => 
        item.query.length > 25 ? item.query.substring(0, 25) + '...' : item.query
      ),
      axisLabel: {
        rotate: 45,
        fontSize: 11
      }
    },
    yAxis: {
      type: 'value',
      name: 'Count'
    },
    series: [
      {
        name: 'Occurrence Count',
        type: 'bar',
        data: data.slice(0, 15).map(item => item.count),
        itemStyle: { 
          color: '#faad14',
          borderRadius: [4, 4, 0, 0]
        },
        emphasis: {
          itemStyle: {
            color: '#d48806'
          }
        }
      }
    ]
  };

  // Pie chart configuration
  const pieChartOption = {
    title: {
      text: 'Query Frequency Distribution',
      textStyle: { fontSize: 16, fontWeight: 'bold' }
    },
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} occurrences'
    },
    series: [
      {
        type: 'pie',
        radius: ['30%', '70%'],
        avoidLabelOverlap: false,
        label: {
          show: false,
          position: 'center'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: '14',
            fontWeight: 'bold'
          }
        },
        labelLine: {
          show: false
        },
        data: data.slice(0, 10).map((item, index) => ({
          value: item.count,
          name: item.query.length > 30 ? item.query.substring(0, 30) + '...' : item.query,
          itemStyle: {
            color: `hsl(${index * 36}, 70%, 50%)`
          }
        }))
      }
    ]
  };

  // Table columns configuration
  const columns: ColumnsType<NoResultSummary> = [
    {
      title: 'Rank',
      key: 'rank',
      width: 80,
      render: (_, __, index) => (
        <div className="text-center font-semibold">
          #{index + 1}
        </div>
      ),
    },
    {
      title: 'Query',
      dataIndex: 'query',
      key: 'query',
      width: '60%',
      render: (text: string) => (
        <p className="text-sm leading-relaxed">{text}</p>
      ),
    },
    {
      title: 'Occurrence Count',
      dataIndex: 'count',
      key: 'count',
      width: 150,
      render: (count: number) => (
        <div className="text-center">
          <div className="inline-flex items-center space-x-2 bg-orange-50 px-3 py-1 rounded-full">
            <StopOutlined className="text-orange-500" />
            <span className="font-semibold text-orange-700">{count}</span>
          </div>
        </div>
      ),
      sorter: (a, b) => a.count - b.count,
    },
    {
      title: 'Percentage',
      key: 'percentage',
      width: 120,
      render: (_, record) => {
        const percentage = stats.totalQueries > 0 ? ((record.count / stats.totalQueries) * 100).toFixed(1) : '0';
        return (
          <div className="text-center">
            <span className="text-gray-600">{percentage}%</span>
          </div>
        );
      },
    },
  ];

  const rangePresets: {
    label: string;
    value: [Dayjs, Dayjs];
  }[] = [
    { label: 'Recent Week', value: [dayjs().subtract(7, 'd'), dayjs()] },
    { label: 'Recent Month', value: [dayjs().subtract(1, 'month'), dayjs()] },
    { label: 'Recent 3 Months', value: [dayjs().subtract(3, 'month'), dayjs()] },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <Title level={2} className="!mb-2">No Result Analysis</Title>
        <p className="text-gray-600">Analysis of queries that returned no results, sorted by occurrence count.</p>
      </div>

      {error && (
        <Alert
          message={error}
          type="error"
          showIcon
          closable
          className="mb-6"
          onClose={() => setError(null)}
        />
      )}

      <Spin spinning={loading}>
        <Row gutter={[24, 24]} className="mb-6">
            <Col xs={24} sm={12} md={6}>
                <Card><Statistic title="Total No-Result Queries" value={stats.totalQueries} prefix={<StopOutlined />} /></Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
                <Card><Statistic title="Unique Queries" value={stats.uniqueQueries} prefix={<QuestionCircleOutlined />} /></Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
                <Card><Statistic title="Avg Occurrence" value={stats.avgOccurrence} prefix={<CalculatorOutlined />} /></Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
                <Card><Statistic title="Top Query Count" value={stats.topQueryCount} prefix={<RiseOutlined />} /></Card>
            </Col>
        </Row>

        <Row gutter={[24, 24]}>
            <Col xs={24} lg={14}>
                <Card>
                    <Title level={4}>Top 15 No-Result Queries</Title>
                    {data.length > 0 ? <ReactECharts option={barChartOption} style={{ height: '400px' }} /> : <div className="h-[400px] flex justify-center items-center"><p>No data for selected period.</p></div>}
                </Card>
            </Col>
            <Col xs={24} lg={10}>
                <Card>
                    <Title level={4}>Frequency Distribution</Title>
                    {data.length > 0 ? <ReactECharts option={pieChartOption} style={{ height: '400px' }} /> : <div className="h-[400px] flex justify-center items-center"><p>No data for selected period.</p></div>}
                </Card>
            </Col>
            <Col span={24}>
                <Card>
                    <div className="flex justify-between items-center mb-4">
                    <Title level={4}>No Result Queries Details</Title>
                    <Space>
                        <RangePicker presets={rangePresets} onChange={handleDateChange} />
                        <Button icon={<DownloadOutlined />} onClick={handleExportCsv} loading={exportingCsv} disabled={data.length === 0}>Export CSV</Button>
                        <Button icon={<FilePdfOutlined />} onClick={handleExportPdf} loading={exportingPdf} disabled={data.length === 0}>Export PDF</Button>
                    </Space>
                    </div>
                    <Table
                        columns={columns}
                        dataSource={data}
                        rowKey="query"
                        pagination={{ pageSize: 10 }}
                    />
                </Card>
            </Col>
        </Row>
      </Spin>
    </div>
  );
};

export default NoResultAnalysis;