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
import type { ColumnsType } from 'antd/es/table';
import { SearchOutlined, EyeOutlined, CalendarOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { QALog } from '../types';
import { qaLogsAPI } from '../services/api';

const { Title } = Typography;
const { Search } = Input;

const QALogs: React.FC = () => {
  const [data, setData] = useState<QALog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<QALog | null>(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });

  useEffect(() => {
    loadQALogs();
  }, [pagination.current, pagination.pageSize, searchText]);

  const loadQALogs = async () => {
    try {
      setLoading(true);
      const skip = (pagination.current - 1) * pagination.pageSize;
      const result = await qaLogsAPI.getLogs(
        skip, 
        pagination.pageSize, 
        searchText || undefined
      );
      setData(result);
      // Note: In a real application, you would get the total count from the API
      // For now, we'll estimate based on the returned data
      setPagination(prev => ({
        ...prev,
        total: result.length < pagination.pageSize ? 
          skip + result.length : 
          skip + result.length + 1
      }));
    } catch (err) {
      setError('Failed to load QA logs data');
      console.error('QA logs data loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearchText(value);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleViewDetails = (record: QALog) => {
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

  // Table columns configuration
  const columns: ColumnsType<QALog> = [
    {
      title: 'Task ID',
      dataIndex: 'task_id',
      key: 'task_id',
      width: '120px',
      render: (text: string) => (
        <Tooltip title={text}>
          <Tag color="blue">{text.substring(0, 8)}...</Tag>
        </Tooltip>
      ),
    },
    {
      title: 'Query',
      dataIndex: 'query',
      key: 'query',
      width: '35%',
      render: (text: string) => (
        <div className="max-w-md">
          <p className="truncate text-sm" title={text}>{text}</p>
        </div>
      ),
    },
    {
      title: 'Response',
      dataIndex: 'response',
      key: 'response',
      width: '35%',
      render: (text: string) => (
        <div className="max-w-md">
          <p className="truncate text-sm" title={text}>{text}</p>
        </div>
      ),
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

      {/* Search Controls */}
      <Card className="mb-6">
        <Space direction="vertical" size="middle" className="w-full">
          <div>
            <Title level={5} className="!mb-2">Search Filters</Title>
            <Search
              placeholder="Search by query content, response, or task ID"
              allowClear
              enterButton={<SearchOutlined />}
              size="large"
              onSearch={handleSearch}
              className="max-w-md"
            />
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
          scroll={{ x: 1000 }}
        />
      </Card>

      {/* Detail Modal */}
      <Modal
        title="QA Log Details"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={900}
      >
        {selectedRecord && (
          <div className="space-y-4">
            <div>
              <Title level={5}>Task ID</Title>
              <Tag color="blue" className="font-mono">{selectedRecord.task_id}</Tag>
            </div>
            
            <div>
              <Title level={5}>Query</Title>
              <div className="bg-gray-50 p-4 rounded border">
                {selectedRecord.query}
              </div>
            </div>
            
            <div>
              <Title level={5}>Response</Title>
              <div className="bg-blue-50 p-4 rounded border">
                {selectedRecord.response}
              </div>
            </div>
            
            <div>
              <Title level={5}>Created At</Title>
              <Space>
                <Tag icon={<CalendarOutlined />} color="green">
                  {dayjs(selectedRecord.created_at).format('YYYY-MM-DD HH:mm:ss')}
                </Tag>
                <span className="text-gray-500">
                  ({dayjs(selectedRecord.created_at).fromNow()})
                </span>
              </Space>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default QALogs;