import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Typography, Alert, Spin } from 'antd';
import { 
  MessageOutlined, 
  FileTextOutlined, 
  ExclamationCircleOutlined, 
  StopOutlined 
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { FeedbackSummary, NoResultSummary } from '../types';
import { feedbackAPI, noResultAPI } from '../services/api';

const { Title } = Typography;

const Dashboard: React.FC = () => {
  const [feedbackData, setFeedbackData] = useState<FeedbackSummary[]>([]);
  const [noResultData, setNoResultData] = useState<NoResultSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [feedback, noResult] = await Promise.all([
        feedbackAPI.getSummary(10),
        noResultAPI.getSummary(10)
      ]);
      
      setFeedbackData(feedback);
      setNoResultData(noResult);
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error('Dashboard data loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics from feedback data
  const totalFeedback = feedbackData.reduce((sum, item) => sum + item.total_count, 0);
  const totalSatisfied = feedbackData.reduce((sum, item) => sum + item.satisfied_count, 0);
  const totalUnsatisfied = feedbackData.reduce((sum, item) => sum + item.unsatisfied_count, 0);
  const satisfactionRate = totalFeedback > 0 ? ((totalSatisfied / totalFeedback) * 100).toFixed(1) : '0';

  // Feedback chart configuration
  const feedbackChartOption = {
    title: {
      text: 'Top 10 Feedback Issues',
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
      data: feedbackData.slice(0, 5).map(item => 
        item.query.length > 30 ? item.query.substring(0, 30) + '...' : item.query
      ),
      axisLabel: {
        rotate: 45,
        fontSize: 11
      }
    },
    yAxis: {
      type: 'value'
    },
    series: [
      {
        name: 'Satisfied',
        type: 'bar',
        stack: 'total',
        data: feedbackData.slice(0, 5).map(item => item.satisfied_count),
        itemStyle: { color: '#52c41a' }
      },
      {
        name: 'Unsatisfied',
        type: 'bar',
        stack: 'total',
        data: feedbackData.slice(0, 5).map(item => item.unsatisfied_count),
        itemStyle: { color: '#ff4d4f' }
      }
    ]
  };

  // No result chart configuration
  const noResultChartOption = {
    title: {
      text: 'Top No-Result Queries',
      textStyle: { fontSize: 16, fontWeight: 'bold' }
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' }
    },
    xAxis: {
      type: 'category',
      data: noResultData.slice(0, 5).map(item => 
        item.query.length > 30 ? item.query.substring(0, 30) + '...' : item.query
      ),
      axisLabel: {
        rotate: 45,
        fontSize: 11
      }
    },
    yAxis: {
      type: 'value'
    },
    series: [
      {
        name: 'Count',
        type: 'bar',
        data: noResultData.slice(0, 5).map(item => item.count),
        itemStyle: { color: '#faad14' }
      }
    ]
  };

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
        <Title level={2} className="!mb-2">Dashboard</Title>
        <p className="text-gray-600">System overview and key metrics</p>
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
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Feedback"
              value={totalFeedback}
              prefix={<MessageOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Satisfaction Rate"
              value={satisfactionRate}
              suffix="%"
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Unsatisfied Count"
              value={totalUnsatisfied}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="No Result Queries"
              value={noResultData.reduce((sum, item) => sum + item.count, 0)}
              prefix={<StopOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Charts */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card>
            <ReactECharts 
              option={feedbackChartOption} 
              style={{ height: '400px' }}
              opts={{ renderer: 'canvas' }}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card>
            <ReactECharts 
              option={noResultChartOption} 
              style={{ height: '400px' }}
              opts={{ renderer: 'canvas' }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;