import React, { useState, useEffect } from 'react';
import { Card, Col, Row, Spin, Statistic, Table, Tag, Typography, Alert } from 'antd';
import { LikeOutlined, DislikeOutlined, MessageOutlined, ArrowUpOutlined, ArrowDownOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { FeedbackDashboardSummary, RecentFeedback, NoResultSummary } from '../types';
import { feedbackAPI, noResultAPI } from '../services/api';

const { Title, Text } = Typography;

const Dashboard: React.FC = () => {
  const [summary, setSummary] = useState<FeedbackDashboardSummary | null>(null);
  const [noResultData, setNoResultData] = useState<NoResultSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [feedbackSummaryData, noResultSummaryResponse] = await Promise.all([
          feedbackAPI.getDashboardSummary(),
          noResultAPI.getSummary(10) // Fetch top 10 no-result queries
        ]);
        setSummary(feedbackSummaryData);
        // FIX: Use the 'data' property from the API response
        setNoResultData(noResultSummaryResponse.data || []);
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
        setError('Could not load dashboard data. The backend service may be unavailable.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // FIX: Ensure noResultData is an array before calling reduce
  const totalNoResultQueries = Array.isArray(noResultData) 
    ? noResultData.reduce((sum, item) => sum + item.count, 0)
    : 0;

  const recentFeedbackColumns: any[] = [
    {
      title: 'Query',
      dataIndex: 'query',
      key: 'query',
      render: (text: string) => <Text ellipsis>{text}</Text>,
    },
    {
      title: 'Feedback',
      dataIndex: 'liked',
      key: 'liked',
      width: 120,
      render: (liked: boolean) => (
        <Tag icon={liked ? <LikeOutlined /> : <DislikeOutlined />} color={liked ? 'success' : 'error'}>
          {liked ? 'Helpful' : 'Not Helpful'}
        </Tag>
      ),
    },
    {
      title: 'Time',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (text: string) => dayjs(text).format('YYYY-MM-DD HH:mm'),
    },
  ];

  const noResultColumns: any[] = [
    {
      title: 'Query',
      dataIndex: 'query',
      key: 'query',
      render: (text: string) => <Text ellipsis>{text}</Text>,
    },
    {
      title: 'Count',
      dataIndex: 'count',
      key: 'count',
      width: 80,
      align: 'right',
      render: (count: number) => <Tag color="orange">{count}</Tag>,
    },
  ];

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center min-h-96">
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return <div className="p-6"><Alert message="Error" description={error} type="error" showIcon /></div>;
  }

  return (
    <div className="p-6 bg-gray-50 min-h-full">
      <Title level={2} className="mb-6">Dashboard</Title>

      {summary && (
        <div className="site-statistic-demo-card mb-6">
          <Row gutter={16}>
            <Col span={6}>
              <Card>
                <Statistic
                  title="Total Feedback"
                  value={summary.total_feedback}
                  prefix={<MessageOutlined />}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="Positive Feedback"
                  value={summary.positive_feedback_count}
                  valueStyle={{ color: '#3f8600' }}
                  prefix={<ArrowUpOutlined />}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="Negative Feedback"
                  value={summary.negative_feedback_count}
                  valueStyle={{ color: '#cf1322' }}
                  prefix={<ArrowDownOutlined />}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="No-Result Queries"
                  value={totalNoResultQueries}
                  valueStyle={{ color: '#d46b08' }}
                  prefix={<QuestionCircleOutlined />}
                />
              </Card>
            </Col>
          </Row>
        </div>
      )}

      <Row gutter={16}>
        <Col span={12}>
          <Card>
            <Title level={4}>Recent Feedback Activity</Title>
            <Table
              columns={recentFeedbackColumns}
              dataSource={summary?.recent_feedback || []}
              rowKey="id"
              pagination={{ pageSize: 5 }}
              size="small"
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card>
            <Title level={4}>Top No-Result Queries</Title>
            <Table
              columns={noResultColumns}
              dataSource={noResultData}
              rowKey="query"
              pagination={{ pageSize: 5 }}
              size="small"
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;