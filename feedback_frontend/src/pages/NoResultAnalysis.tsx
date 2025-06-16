import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Card, 
  Typography, 
  Alert, 
  Spin,
  Row,
  Col,
  Statistic
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { StopOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { NoResultSummary } from '../types';
import { noResultAPI } from '../services/api';

const { Title } = Typography;

const NoResultAnalysis: React.FC = () => {
  const [data, setData] = useState<NoResultSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const result = await noResultAPI.getSummary(50);
      setData(result);
    } catch (err) {
      setError('Failed to load no-result data');
      console.error('No-result data loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const totalQueries = data.reduce((sum, item) => sum + item.count, 0);
  const uniqueQueries = data.length;
  const avgOccurrence = uniqueQueries > 0 ? (totalQueries / uniqueQueries).toFixed(1) : '0';
  const topQuery = data.length > 0 ? data[0] : null;

  // Chart configuration for top no-result queries
  const chartOption = {
    title: {
      text: 'Top 15 No-Result Queries',
      textStyle: { fontSize: 16, fontWeight: 'bold' }
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' }
    },
    xAxis: {
      type: 'category',
      data: data.slice(0, 15).map((item, index) => 
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

  // Word cloud-like chart configuration
  const wordCloudOption = {
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
            color: `hsl(${index * 36}, 50%, 50%)`
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
      width: '80px',
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
      width: '70%',
      render: (text: string) => (
        <div className="max-w-2xl">
          <p className="text-sm leading-relaxed">{text}</p>
        </div>
      ),
    },
    {
      title: 'Occurrence Count',
      dataIndex: 'count',
      key: 'count',
      width: '150px',
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
      width: '120px',
      render: (_, record) => {
        const percentage = totalQueries > 0 ? ((record.count / totalQueries) * 100).toFixed(1) : '0';
        return (
          <div className="text-center">
            <span className="text-gray-600">{percentage}%</span>
          </div>
        );
      },
    },
  ];

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center min-h-96">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <Title level={2} className="!mb-2">No Result Analysis</Title>
        <p className="text-gray-600">Identify queries that returned no results to find knowledge gaps</p>
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

      {/* Statistics Cards */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Total No-Result Queries"
              value={totalQueries}
              valueStyle={{ color: '#faad14' }}
              prefix={<StopOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Unique Queries"
              value={uniqueQueries}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Avg Occurrence"
              value={avgOccurrence}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Top Query Count"
              value={topQuery?.count || 0}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Charts */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} lg={14}>
          <Card>
            <ReactECharts 
              option={chartOption} 
              style={{ height: '400px' }}
              opts={{ renderer: 'canvas' }}
            />
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card>
            <ReactECharts 
              option={wordCloudOption} 
              style={{ height: '400px' }}
              opts={{ renderer: 'canvas' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Data Table */}
      <Card>
        <div className="mb-4">
          <Title level={4}>Detailed Query Analysis</Title>
          <p className="text-gray-600">Complete list of queries that returned no results, ranked by frequency</p>
        </div>
        <Table
          columns={columns}
          dataSource={data}
          rowKey={(record, index) => `${record.query}-${index}`}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} of ${total} items`,
          }}
          scroll={{ x: 800 }}
        />
      </Card>
    </div>
  );
};

export default NoResultAnalysis;