import React, { useState, useEffect } from 'react';
import {
  Table,
  Card,
  Typography,
  Alert,
  Spin,
  Tag,
  Radio,
  Space,
  Button,
  Modal,
  Row,
  Col,
  Statistic,
  DatePicker
} from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { LikeOutlined, DislikeOutlined, EyeOutlined, PercentageOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Feedback } from '../types';
import { feedbackAPI } from '../services/api';

const { Title, Paragraph, Text } = Typography;
const { RangePicker } = DatePicker;

type RangeValue = [Dayjs | null, Dayjs | null] | null;

const FeedbackManagement: React.FC = () => {
  const [data, setData] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [filter, setFilter] = useState<'all' | 'liked' | 'disliked'>('all');
  const [dateRange, setDateRange] = useState<RangeValue>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<Feedback | null>(null);

  const fetchData = async (
    page = pagination.current,
    pageSize = pagination.pageSize,
    currentFilter = filter,
    startDate?: string,
    endDate?: string
  ) => {
    try {
      setLoading(true);
      const skip = ((page || 1) - 1) * (pageSize || 10);
      const liked = currentFilter === 'all' ? undefined : currentFilter === 'liked';

      const response = await feedbackAPI.getFeedbacks(skip, pageSize, liked, startDate, endDate);

      setData(response.data);
      setPagination(prev => ({ ...prev, total: response.total }));
    } catch (err) {
      setError('Failed to load feedback data');
      console.error('Feedback data loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const startDate = dateRange?.[0]?.startOf('day').toISOString();
    const endDate = dateRange?.[1]?.endOf('day').toISOString();
    fetchData(pagination.current, pagination.pageSize, filter, startDate, endDate);
  }, [filter, pagination.current, pagination.pageSize, dateRange]);

  const handleTableChange = (newPagination: TablePaginationConfig) => {
    setPagination(newPagination);
  };

  const handleFilterChange = (newFilter: 'all' | 'liked' | 'disliked') => {
    setFilter(newFilter);
    setPagination(prev => ({ ...prev, current: 1 })); // Reset to first page on filter change
  };

  const handleDateChange = (dates: RangeValue) => {
    setDateRange(dates);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const showDetails = (record: Feedback) => {
    setSelectedRecord(record);
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    setSelectedRecord(null);
  };

  const rangePresets: {
    label: string;
    value: [Dayjs, Dayjs];
  }[] = [
    { label: 'Recent Week', value: [dayjs().subtract(7, 'd'), dayjs()] },
    { label: 'Recent Month', value: [dayjs().subtract(1, 'month'), dayjs()] },
    { label: 'Recent 3 Months', value: [dayjs().subtract(3, 'month'), dayjs()] },
  ];

  const columns: ColumnsType<Feedback> = [
    { title: 'Query', dataIndex: 'query', key: 'query', width: '25%', render: (text) => <Paragraph ellipsis={{ rows: 2, expandable: true, symbol: 'more' }}>{text}</Paragraph> },
    { title: 'Response', dataIndex: 'response', key: 'response', width: '25%', render: (text) => text ? <Paragraph ellipsis={{ rows: 2, expandable: true, symbol: 'more' }}>{text}</Paragraph> : <Text type="secondary">N/A</Text> },
    { title: 'Feedback', dataIndex: 'liked', key: 'liked', width: 150, render: (liked: boolean) => (<Tag icon={liked ? <LikeOutlined /> : <DislikeOutlined />} color={liked ? 'success' : 'error'}>{liked ? 'Satisfied' : 'Unsatisfied'}</Tag>) },
    { title: 'Reason', dataIndex: 'reason', key: 'reason', render: (reason) => reason ? <Paragraph ellipsis={{ rows: 2, expandable: true, symbol: 'more' }}>{reason}</Paragraph> : <Text type="secondary">N/A</Text> },
    { title: 'Date', dataIndex: 'created_at', key: 'created_at', width: 180, sorter: true, render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm') },
    { title: 'Action', key: 'action', width: 120, render: (_, record) => (<Button icon={<EyeOutlined />} onClick={() => showDetails(record)} size="small">Details</Button>) }
  ];

  // Note: Statistics are now client-side based on the current page. For global stats, a separate API endpoint would be needed.
  const satisfactionRate = data.length > 0 ? (data.filter(i => i.liked).length / data.length) * 100 : 0;

  return (
    <div className="p-6">
      <div className="mb-6"><Title level={2} className="!mb-2">Feedback Management</Title><p className="text-gray-600">Review and analyze individual user feedback entries.</p></div>
      {error && <Alert message={error} type="error" showIcon closable className="mb-6" onClose={() => setError(null)} />}

      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={8}><Card><Statistic title="Total Feedback (in view)" value={pagination.total} /></Card></Col>
        <Col xs={24} sm={8}><Card><Statistic title="Satisfied (on this page)" value={data.filter(i => i.liked).length} prefix={<LikeOutlined />} /></Card></Col>
        <Col xs={24} sm={8}><Card><Statistic title="Satisfaction Rate (on this page)" value={satisfactionRate.toFixed(1)} suffix="%"/></Card></Col>
      </Row>

      <Card>
        <div className="flex justify-between items-center mb-4">
          <Radio.Group value={filter} onChange={e => handleFilterChange(e.target.value)}>
            <Radio.Button value="all">All</Radio.Button>
            <Radio.Button value="liked">Satisfied</Radio.Button>
            <Radio.Button value="disliked">Unsatisfied</Radio.Button>
          </Radio.Group>
          <RangePicker name="feedbackDateRange" presets={rangePresets} onChange={handleDateChange} />
        </div>
        <Table columns={columns} dataSource={data} rowKey={(record) => `${record.query}-${record.created_at}`} loading={loading} pagination={pagination} onChange={handleTableChange} scroll={{ x: 1400 }} />
      </Card>

      <Modal title="Feedback Details" open={isModalVisible} onCancel={handleCancel} footer={<Button key="close" onClick={handleCancel}>Close</Button>} width={800}>
        {selectedRecord && (
          <Space direction="vertical" size="middle" className="w-full">
            <div><Text strong>Query:</Text><Paragraph className="mt-1">{selectedRecord.query}</Paragraph></div>
            <div><Text strong>Feedback:</Text><div className="mt-1"><Tag icon={selectedRecord.liked ? <LikeOutlined /> : <DislikeOutlined />} color={selectedRecord.liked ? 'success' : 'error'}>{selectedRecord.liked ? 'Satisfied' : 'Unsatisfied'}</Tag></div></div>
            {selectedRecord.reason && <div><Text strong>Reason:</Text><Paragraph className="mt-1">{selectedRecord.reason}</Paragraph></div>}
            {selectedRecord.response && (
              <div>
                <Text strong>Response:</Text>
                <Card size="small" className="mt-1 max-h-80 overflow-y-auto">
                  <div className="prose max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {selectedRecord.response}
                    </ReactMarkdown>
                  </div>
                </Card>
              </div>
            )}
            <div><Text strong>Date:</Text><Paragraph className="mt-1">{dayjs(selectedRecord.created_at).format('YYYY-MM-DD HH:mm:ss')}</Paragraph></div>
          </Space>
        )}
      </Modal>
    </div>
  );
};

export default FeedbackManagement;