import React, { useState, useEffect } from 'react';
import {
  Table,
  Card,
  Typography,
  Alert,
  Spin,
  Input,
  Space,
  Button,
  Modal,
  Tag,
  Tooltip
} from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { SearchOutlined, EyeOutlined, CalendarOutlined, InfoCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { QALog, RerankResult } from '../types';
import { qaLogsAPI } from '../services/api';

const { Title, Paragraph } = Typography;
const { Search } = Input;
dayjs.extend(relativeTime);

const QALogs: React.FC = () => {
  const [data, setData] = useState<QALog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<QALog | null>(null);
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  const loadQALogs = async (
    page = pagination.current,
    pageSize = pagination.pageSize,
    search = searchText
  ) => {
    try {
      setLoading(true);
      const skip = ((page || 1) - 1) * (pageSize || 20);
      const response = await qaLogsAPI.getLogs(skip, pageSize, search || undefined);
      setData(response.data);
      setPagination(prev => ({
        ...prev,
        total: response.total,
      }));
    } catch (err) {
      setError('Failed to load QA logs data');
      console.error('QA logs data loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQALogs();
  }, [pagination.current, pagination.pageSize, searchText]);

  const handleSearch = (value: string) => {
    setSearchText(value);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleViewDetails = (record: QALog) => {
    setSelectedRecord(record);
    setModalVisible(true);
  };

  const handleTableChange = (newPagination: TablePaginationConfig) => {
    setPagination(newPagination);
  };

  // Table columns configuration
  const columns: ColumnsType<QALog> = [
    {
      title: 'Task ID',
      dataIndex: 'task_id',
      key: 'task_id',
      width: 150,
      render: (text: string) => (
        <Tooltip title={text}><Tag color="blue">{text.substring(0, 8)}...</Tag></Tooltip>
      ),
    },
    {
      title: 'Query',
      dataIndex: 'query',
      key: 'query',
      render: (text: string) => <Paragraph ellipsis={{ rows: 2, expandable: true }}>{text}</Paragraph>
    },
    {
      title: 'Response',
      dataIndex: 'response',
      key: 'response',
      render: (text: string) => <Paragraph ellipsis={{ rows: 2, expandable: true }}>{text}</Paragraph>
    },
    {
      title: 'Reranked Results',
      dataIndex: 'rerank_results',
      key: 'rerank_results',
      width: 150,
      render: (results: RerankResult[]) => (
        <Tag icon={<InfoCircleOutlined />} color={results?.length > 0 ? "success" : "default"}>
          {results?.length || 0} items
        </Tag>
      ),
    },
    {
      title: 'Created At',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm:ss'),
      sorter: true,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Button
          type="primary"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => handleViewDetails(record)}
        >
          Details
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
        <Title level={2} className="!mb-2">QA Logs</Title>
        <p className="text-gray-600">View and search through question-answer interaction logs</p>
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

      <Card className="mb-6">
        <Space direction="vertical" size="middle" className="w-full">
          <div>
            <Title level={5} className="!mb-2">Search Filters</Title>
            <Search
              placeholder="Search by query content"
              allowClear
              enterButton={<SearchOutlined />}
              size="large"
              onSearch={handleSearch}
              className="max-w-md"
            />
          </div>
        </Space>
      </Card>

      <Card>
        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          pagination={pagination}
          onChange={handleTableChange}
          scroll={{ x: 1300 }}
          expandable={{ expandedRowRender }}
        />
      </Card>

      <Modal
        title="QA Log Details"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={900}
      >
        {selectedRecord && (
          <div className="space-y-4">
            <div><Title level={5}>Task ID</Title><Tag color="blue" className="font-mono">{selectedRecord.task_id}</Tag></div>
            <div><Title level={5}>Query</Title><div className="bg-gray-50 p-4 rounded border">{selectedRecord.query}</div></div>
            <div><Title level={5}>Response</Title>
              <Card size="small" className="mt-1 max-h-80 overflow-y-auto">
                <div className="prose max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {selectedRecord.response}
                  </ReactMarkdown>
                </div>
              </Card>
            </div>
            {selectedRecord.rerank_results && selectedRecord.rerank_results.length > 0 && (
              <div><Title level={5}>Reranked Results</Title><div className="bg-gray-50 p-2 rounded border">{expandedRowRender(selectedRecord)}</div></div>
            )}
            <div>
              <Title level={5}>Created At</Title>
              <Space>
                <Tag icon={<CalendarOutlined />} color="green">{dayjs(selectedRecord.created_at).format('YYYY-MM-DD HH:mm:ss')}</Tag>
                <span className="text-gray-500">({dayjs(selectedRecord.created_at).fromNow()})</span>
              </Space>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

const expandedRowRender = (record: QALog) => {
  const columns: ColumnsType<RerankResult> = [
    { title: 'Index', dataIndex: 'original_index', key: 'original_index', width: 80, render: (text) => <Tag>#{text}</Tag> },
    {
      title: 'Content',
      dataIndex: 'content',
      key: 'content',
      render: (text) => <Paragraph ellipsis={{ rows: 2, expandable: true, symbol: 'more' }}>{text || 'N/A'}</Paragraph>
    },
    { title: 'Similarity', dataIndex: 'similarity', key: 'similarity', width: 100, render: (score) => <Tag color="purple">{score?.toFixed(3)}</Tag> },
    { title: 'Relevance', dataIndex: 'relevance', key: 'relevance', width: 100, render: (score) => <Tag color="volcano">{score?.toFixed(3)}</Tag> },
  ];

  return <Table columns={columns} dataSource={record.rerank_results} rowKey="id" pagination={false} />;
};

export default QALogs;