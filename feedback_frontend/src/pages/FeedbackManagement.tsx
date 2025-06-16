import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Card, 
  Typography, 
  Alert, 
  Spin, 
  Tag, 
  Button,
  Modal,
  Space,
  Row,
  Col,
  Statistic
} from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { EyeOutlined, LikeOutlined, DislikeOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { FeedbackSummary } from '../types';
import { feedbackAPI } from '../services/api';

const { Title } = Typography;

const FeedbackManagement: React.FC = () => {
  const [data, setData] = useState<FeedbackSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<FeedbackSummary | null>(null);

  useEffect(() => {
    loadFeedbackData();
  }, []);

  const loadFeedbackData = async () => {
    try {
      setLoading(true);
      const result = await feedbackAPI.getSummary(50);
      setData(result);
    } catch (err) {
      setError('Failed to load feedback data');
      console.error('Feedback data loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (record: FeedbackSummary) => {
    setSelectedRecord(record);
    setModalVisible(true);
  };

  // Table columns configuration
  const columns: ColumnsType<FeedbackSummary> = [
    {
      title: 'Query',
      dataIndex: 'query',
      key: 'query',
      width: '40%',
      render: (text: string) => (
        <div className="max-w-md">
          <p className="truncate text-sm">{text}</p>
        </div>
      ),
    },
    {
      title: 'Satisfied',
      dataIndex: 'satisfied_count',
      key: 'satisfied_count',
      width: '15%',
      render: (count: number) => (
        <Tag color="green" icon={<LikeOutlined />}>
          {count}
        </Tag>
      ),
      sorter: (a, b) => a.satisfied_count - b.satisfied_count,
    },
    {
      title: 'Unsatisfied',
      dataIndex: 'unsatisfied_count',
      key: 'unsatisfied_count',
      width: '15%',
      render: (count: number) => (
        <Tag color="red" icon={<DislikeOutlined />}>
          {count}
        </Tag>
      ),
      sorter: (a, b) => a.unsatisfied_count - b.unsatisfied_count,
    },
    {
      title: 'Total',
      dataIndex: 'total_count',
      key: 'total_count',
      width: '15%',
      render: (count: number) => (
        <Tag color="blue">{count}</Tag>
      ),
      sorter: (a, b) => a.total_count - b.total_count,
    },
    {
      title: 'Satisfaction Rate',
      key: 'satisfaction_rate',
      width: '15%',
      render: (_, record) => {
        const rate = record.total_count > 0 
          ? ((record.satisfied_count / record.total_count) * 100).toFixed(1)
          : '0';
        const color = parseFloat(rate) >= 70 ? 'green' : parseFloat(rate) >= 40 ? 'orange' : 'red';
        return <Tag color={color}>{rate}%</Tag>;
      },
      sorter: (a, b) => {
        const rateA = a.total_count > 0 ? (a.satisfied_count / a.total_count) : 0;
        const rateB = b.total_count > 0 ? (b.satisfied_count / b.total_count) : 0;
        return rateA - rateB;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Button
          type="primary"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => handleViewDetails(record)}
        >
          View Details
        </Button>
      ),
    },
  ];

  // Chart configuration for feedback overview
  const chartOption = {
    title: {
      text: 'Feedback Distribution (Top 10)',
      textStyle: { fontSize: 16, fontWeight: 'bold' }
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' }
    },
    legend: {
      data: ['Satisfied', 'Unsatisfied']
    },
    xAxis: {
      type: 'category',
      data: data.slice(0, 10).map((item, index) => `Query ${index + 1}`),
    },
    yAxis: {
      type: 'value'
    },
    series: [
      {
        name: 'Satisfied',
        type: 'bar',
        stack: 'total',
        data: data.slice(0, 10).map(item => item.satisfied_count),
        itemStyle: { color: '#52c41a' }
      },
      {
        name: 'Unsatisfied',
        type: 'bar',
        stack: 'total',
        data: data.slice(0, 10).map(item => item.unsatisfied_count),
        itemStyle: { color: '#ff4d4f' }
      }
    ]
  };

  // Calculate summary statistics
  const totalFeedback = data.reduce((sum, item) => sum + item.total_count, 0);
  const totalSatisfied = data.reduce((sum, item) => sum + item.satisfied_count, 0);
  const overallSatisfactionRate = totalFeedback > 0 
    ? ((totalSatisfied / totalFeedback) * 100).toFixed(1) 
    : '0';

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
        <Title level={2} className="!mb-2">Feedback Management</Title>
        <p className="text-gray-600">Monitor and analyze user feedback data</p>
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

      {/* Summary Statistics */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Total Feedback Entries"
              value={totalFeedback}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Satisfied Responses"
              value={totalSatisfied}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Overall Satisfaction Rate"
              value={overallSatisfactionRate}
              suffix="%"
              valueStyle={{ color: parseFloat(overallSatisfactionRate) >= 70 ? '#52c41a' : '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Chart */}
      <Card className="mb-6">
        <ReactECharts 
          option={chartOption} 
          style={{ height: '400px' }}
          opts={{ renderer: 'canvas' }}
        />
      </Card>

      {/* Data Table */}
      <Card>
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
          scroll={{ x: 1000 }}
        />
      </Card>

      {/* Detail Modal */}
      <Modal
        title="Feedback Details"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={800}
      >
        {selectedRecord && (
          <div>
            <div className="mb-4">
              <Title level={4}>Query</Title>
              <p className="text-gray-700 bg-gray-50 p-3 rounded">
                {selectedRecord.query}
              </p>
            </div>
            
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={8}>
                <Statistic
                  title="Satisfied Count"
                  value={selectedRecord.satisfied_count}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Col>
              <Col xs={24} sm={8}>
                <Statistic
                  title="Unsatisfied Count"
                  value={selectedRecord.unsatisfied_count}
                  valueStyle={{ color: '#ff4d4f' }}
                />
              </Col>
              <Col xs={24} sm={8}>
                <Statistic
                  title="Total Count"
                  value={selectedRecord.total_count}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Col>
            </Row>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default FeedbackManagement;