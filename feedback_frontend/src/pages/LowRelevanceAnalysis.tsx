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
  Row,
  Col,
  Statistic
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { EyeOutlined, WarningOutlined, InfoCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { LowRelevanceSummary, LowRelevanceResult } from '../types';
import { lowRelevanceAPI } from '../services/api';

const { Title, Paragraph, Text } = Typography;

const LowRelevanceAnalysis: React.FC = () => {
  const [data, setData] = useState<LowRelevanceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<LowRelevanceResult | null>(null);
  const [scoreRange, setScoreRange] = useState<[number, number]>([0, 1]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  useEffect(() => {
    loadData();
  }, [pagination.current, pagination.pageSize, scoreRange]);

  const loadData = async () => {
    try {
      setLoading(true);
      const skip = (pagination.current - 1) * pagination.pageSize;
      const result = await lowRelevanceAPI.getResults(
        skip,
        pagination.pageSize,
        scoreRange[0],
        scoreRange[1]
      );

      setData(result.data);
      setPagination(prev => ({
        ...prev,
        total: result.total,
      }));
    } catch (err) {
      setError('Failed to load low relevance data');
      console.error('Low relevance data loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (record: LowRelevanceResult) => {
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

  const expandedRowRender = (record: LowRelevanceSummary) => {
    const columns: ColumnsType<LowRelevanceResult> = [
      {
        title: 'Content',
        dataIndex: 'content',
        key: 'content',
        width: '50%',
        render: (text) => <Paragraph ellipsis={{ rows: 2, expandable: true, symbol: 'more' }}>{text || 'N/A'}</Paragraph>
      },
      { title: 'Relevance', dataIndex: 'relevance_score', key: 'relevance_score', width: 120, sorter: (a, b) => a.relevance_score - b.relevance_score, render: (score) => <Tag color={score < 0.3 ? 'red' : 'orange'}>{score.toFixed(3)}</Tag> },
      { title: 'Index', dataIndex: 'original_index', key: 'original_index', width: 100, sorter: (a, b) => a.original_index - b.original_index, render: (text) => <Tag>#{text}</Tag> },
      { title: 'Created At', dataIndex: 'created_at', key: 'created_at', width: 150, render: (date) => dayjs(date).format('YYYY-MM-DD HH:mm') },
      {
        title: 'Actions',
        key: 'actions',
        width: 100,
        render: (_, detailRecord) => (
          <Button icon={<EyeOutlined />} size="small" onClick={() => handleViewDetails(detailRecord)}>Details</Button>
        ),
      },
    ];

    return <Table columns={columns} dataSource={record.results} rowKey="id" pagination={false} />;
  };

  // Table columns configuration for summary
  const columns: ColumnsType<LowRelevanceSummary> = [
    {
      title: 'Query',
      dataIndex: 'query',
      key: 'query',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: 'Count',
      dataIndex: 'count',
      key: 'count',
      width: 100,
      sorter: (a, b) => a.count - b.count,
    },
    {
      title: 'Avg. Relevance Score',
      dataIndex: 'avg_relevance_score',
      key: 'avg_relevance_score',
      width: 200,
      render: (score: number) => {
        const color = score < 0.3 ? 'red' : score < 0.6 ? 'orange' : 'green';
        return (
          <Tag color={color} icon={<WarningOutlined />}>
            {score.toFixed(3)}
          </Tag>
        );
      },
      sorter: (a, b) => a.avg_relevance_score - b.avg_relevance_score,
    },
    {
      title: 'Details',
      dataIndex: 'results',
      key: 'details',
      width: 120,
      render: (results: LowRelevanceResult[]) => (
        <Tag icon={<InfoCircleOutlined />} color="blue">
          {results?.length || 0} records
        </Tag>
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
        <Title level={2} className="!mb-2">Low Relevance Analysis</Title>
        <p className="text-gray-600">Grouped analysis of queries with low relevance scores.</p>
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

      <Card>
        <div className="flex justify-between items-center mb-4">
          <Title level={4}>Low Relevance Summaries</Title>
        </div>
        <Table
          columns={columns}
          dataSource={data}
          rowKey="query"
          loading={loading}
          pagination={pagination}
          onChange={handleTableChange}
          expandable={{ expandedRowRender }}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* Details Modal */}
      <Modal
        title="Query Details"
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setModalVisible(false)}>
            Close
          </Button>,
        ]}
        width={800}
      >
        {selectedRecord && (
          <div>
            <p><strong>Query:</strong> {selectedRecord.query}</p>
            <p><strong>Content:</strong> {selectedRecord.content || 'N/A'}</p>
            <p><strong>Relevance Score:</strong> {selectedRecord.relevance_score.toFixed(4)}</p>
            <p><strong>Original Index:</strong> {selectedRecord.original_index}</p>
            <p><strong>Created At:</strong> {dayjs(selectedRecord.created_at).format('YYYY-MM-DD HH:mm:ss')}</p>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default LowRelevanceAnalysis;