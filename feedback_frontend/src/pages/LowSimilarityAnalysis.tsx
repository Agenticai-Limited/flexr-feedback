import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Card, 
  Typography, 
  Alert, 
  Spin,
  Slider,
  Space,
  Button,
  Modal,
  Tag,
  Select,
  Row,
  Col,
  Statistic
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { EyeOutlined, WarningOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { LowSimilarityQuery } from '../types';
import { lowSimilarityAPI } from '../services/api';

const { Title } = Typography;
const { Option } = Select;

const LowSimilarityAnalysis: React.FC = () => {
  const [data, setData] = useState<LowSimilarityQuery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<LowSimilarityQuery | null>(null);
  const [scoreRange, setScoreRange] = useState<[number, number]>([0, 1]);
  const [selectedMetricType, setSelectedMetricType] = useState<string | undefined>(undefined);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });

  useEffect(() => {
    loadData();
  }, [pagination.current, pagination.pageSize, scoreRange, selectedMetricType]);

  const loadData = async () => {
    try {
      setLoading(true);
      const skip = (pagination.current - 1) * pagination.pageSize;
      const result = await lowSimilarityAPI.getQueries(
        skip,
        pagination.pageSize,
        scoreRange[0],
        scoreRange[1]
      );
      
      // Filter by metric type if selected
      const filteredData = selectedMetricType 
        ? result.filter(item => item.metric_type === selectedMetricType)
        : result;
      
      setData(filteredData);
      setPagination(prev => ({
        ...prev,
        total: filteredData.length < pagination.pageSize ? 
          skip + filteredData.length : 
          skip + filteredData.length + 1
      }));
    } catch (err) {
      setError('Failed to load low similarity data');
      console.error('Low similarity data loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (record: LowSimilarityQuery) => {
    setSelectedRecord(record);
    setModalVisible(true);
  };

  const handleTableChange = (paginationConfig: any) => {
    setPagination({
      ...pagination,
      current: paginationConfig.current,
      pageSize: paginationConfig.pageSize,
    });
  };

  const handleScoreRangeChange = (value: number[]) => {
    setScoreRange([value[0], value[1]]);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleMetricTypeChange = (value: string) => {
    setSelectedMetricType(value === 'all' ? undefined : value);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  // Get unique metric types for filter
  const metricTypes = Array.from(new Set(data.map(item => item.metric_type)));

  // Calculate statistics
  const avgSimilarityScore = data.length > 0 
    ? (data.reduce((sum, item) => sum + item.similarity_score, 0) / data.length).toFixed(3)
    : '0';
  const minScore = data.length > 0 ? Math.min(...data.map(item => item.similarity_score)).toFixed(3) : '0';
  const maxScore = data.length > 0 ? Math.max(...data.map(item => item.similarity_score)).toFixed(3) : '0';

  // Table columns configuration
  const columns: ColumnsType<LowSimilarityQuery> = [
    {
      title: 'Query Type',
      dataIndex: 'query_type',
      key: 'query_type',
      width: '100px',
      render: (type: number) => (
        <Tag color={type === 1 ? 'blue' : 'green'}>
          {type === 1 ? 'Type 1' : 'Type 0'}
        </Tag>
      ),
    },
    {
      title: 'Column',
      dataIndex: 'col',
      key: 'col',
      width: '120px',
      render: (col: string) => <Tag color="purple">{col}</Tag>,
    },
    {
      title: 'Query Content',
      dataIndex: 'query_content',
      key: 'query_content',
      width: '35%',
      render: (text: string) => (
        <div className="max-w-md">
          <p className="truncate text-sm" title={text}>{text}</p>
        </div>
      ),
    },
    {
      title: 'Similarity Score',
      dataIndex: 'similarity_score',
      key: 'similarity_score',
      width: '130px',
      render: (score: number) => {
        const color = score < 0.3 ? 'red' : score < 0.6 ? 'orange' : 'green';
        return (
          <Tag color={color} icon={score < 0.3 ? <WarningOutlined /> : undefined}>
            {score.toFixed(3)}
          </Tag>
        );
      },
      sorter: (a, b) => a.similarity_score - b.similarity_score,
    },
    {
      title: 'Metric Type',
      dataIndex: 'metric_type',
      key: 'metric_type',
      width: '120px',
      render: (type: string) => <Tag color="cyan">{type}</Tag>,
    },
    {
      title: 'Created At',
      dataIndex: 'created_at',
      key: 'created_at',
      width: '150px',
      render: (date: string) => (
        <div>
          <div className="text-sm">{dayjs(date).format('YYYY-MM-DD')}</div>
          <div className="text-xs text-gray-500">{dayjs(date).format('HH:mm:ss')}</div>
        </div>
      ),
      sorter: (a, b) => dayjs(a.created_at).unix() - dayjs(b.created_at).unix(),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: '100px',
      render: (_, record) => (
        <Button
          type="primary"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => handleViewDetails(record)}
        >
          View
        </Button>
      ),
    },
  ];

  if (loading && data.length === 0) {
    return (
      <div className="p-6 flex justify-center items-center min-h-96">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <Title level={2} className="!mb-2">Low Similarity Analysis</Title>
        <p className="text-gray-600">Analyze queries with low similarity scores to identify system limitations</p>
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
              title="Total Queries"
              value={data.length}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Average Score"
              value={avgSimilarityScore}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Min Score"
              value={minScore}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Max Score"
              value={maxScore}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Filter Controls */}
      <Card className="mb-6">
        <Space direction="vertical" size="middle" className="w-full">
          <div>
            <Title level={5} className="!mb-2">Similarity Score Range</Title>
            <div className="max-w-md">
              <Slider
                range
                min={0}
                max={1}
                step={0.01}
                value={scoreRange}
                onChange={handleScoreRangeChange}
                marks={{
                  0: '0',
                  0.25: '0.25',
                  0.5: '0.5',
                  0.75: '0.75',
                  1: '1'
                }}
              />
              <div className="mt-2 text-sm text-gray-600">
                Current range: {scoreRange[0].toFixed(2)} - {scoreRange[1].toFixed(2)}
              </div>
            </div>
          </div>
          
          <div>
            <Title level={5} className="!mb-2">Metric Type</Title>
            <Select
              placeholder="Select metric type"
              allowClear
              onChange={handleMetricTypeChange}
              className="w-48"
            >
              <Option value="all">All Types</Option>
              {metricTypes.map(type => (
                <Option key={type} value={type}>{type}</Option>
              ))}
            </Select>
          </div>
        </Space>
      </Card>

      {/* Data Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} of ${total} items`,
          }}
          onChange={handleTableChange}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* Detail Modal */}
      <Modal
        title="Low Similarity Query Details"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={900}
      >
        {selectedRecord && (
          <div className="space-y-4">
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Title level={5}>Query Type</Title>
                <Tag color={selectedRecord.query_type === 1 ? 'blue' : 'green'} className="text-base">
                  {selectedRecord.query_type === 1 ? 'Type 1' : 'Type 0'}
                </Tag>
              </Col>
              <Col span={12}>
                <Title level={5}>Column</Title>
                <Tag color="purple" className="text-base">{selectedRecord.col}</Tag>
              </Col>
            </Row>

            <div>
              <Title level={5}>Query Content</Title>
              <div className="bg-gray-50 p-4 rounded border">
                {selectedRecord.query_content}
              </div>
            </div>

            <Row gutter={[16, 16]}>
              <Col span={8}>
                <Title level={5}>Similarity Score</Title>
                <Tag 
                  color={selectedRecord.similarity_score < 0.3 ? 'red' : 
                         selectedRecord.similarity_score < 0.6 ? 'orange' : 'green'} 
                  className="text-base"
                  icon={selectedRecord.similarity_score < 0.3 ? <WarningOutlined /> : undefined}
                >
                  {selectedRecord.similarity_score.toFixed(3)}
                </Tag>
              </Col>
              <Col span={8}>
                <Title level={5}>Metric Type</Title>
                <Tag color="cyan" className="text-base">{selectedRecord.metric_type}</Tag>
              </Col>
              <Col span={8}>
                <Title level={5}>Created At</Title>
                <div className="text-sm">
                  {dayjs(selectedRecord.created_at).format('YYYY-MM-DD HH:mm:ss')}
                </div>
              </Col>
            </Row>

            {selectedRecord.results && (
              <div>
                <Title level={5}>Results</Title>
                <div className="bg-blue-50 p-4 rounded border max-h-48 overflow-y-auto">
                  {selectedRecord.results}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default LowSimilarityAnalysis;