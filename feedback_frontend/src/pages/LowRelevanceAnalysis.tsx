import React, { useState, useEffect } from 'react';
import {
  Table,
  Card,
  Typography,
  Alert,
  Spin,
  Button,
  Modal,
  Tag,
  DatePicker,
  Space
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { EyeOutlined, WarningOutlined, InfoCircleOutlined, DownloadOutlined, FilePdfOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { LowRelevanceSummary, LowRelevanceResult } from '../types';
import { lowRelevanceAPI } from '../services/api';

const { Title, Paragraph, Text } = Typography;
const { RangePicker } = DatePicker;

type RangeValue = [Dayjs | null, Dayjs | null] | null;

const LowRelevanceAnalysis: React.FC = () => {
  const [data, setData] = useState<LowRelevanceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<LowRelevanceResult | null>(null);
  const [dateRange, setDateRange] = useState<RangeValue>(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  useEffect(() => {
    loadData();
  }, [pagination.current, pagination.pageSize, dateRange]);

  const loadData = async () => {
    try {
      setLoading(true);
      const skip = (pagination.current - 1) * pagination.pageSize;
      
      const startDate = dateRange?.[0]?.startOf('day').toISOString();
      const endDate = dateRange?.[1]?.endOf('day').toISOString();

      const result = await lowRelevanceAPI.getResults(
        skip,
        pagination.pageSize,
        startDate,
        endDate
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

  const handleDateChange = (dates: RangeValue) => {
    setDateRange(dates);
    setPagination(prev => ({ ...prev, current: 1 })); // Reset to first page
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

  const handleExportCsv = async () => {
    setExportingCsv(true);
    try {
      const startDate = dateRange?.[0]?.startOf('day').toISOString();
      const endDate = dateRange?.[1]?.endOf('day').toISOString();

      const result = await lowRelevanceAPI.getResults(0, pagination.total, startDate, endDate);
      
      const exportData = result.data.flatMap(summary => 
        summary.results.map(detail => ({
          Query: summary.query,
          'Relevance Score': detail.relevance_score,
          'Page ID': detail.page_id,
          'Section Name': detail.section_name,
          'Page Title': detail.title,
          'Created At': dayjs(detail.created_at).format('YYYY-MM-DD HH:mm:ss'),
          Content: detail.content?.substring(0, 200) || '',
        }))
      );

      const csv = Papa.unparse(exportData);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `low-relevance-export-${dayjs().format('YYYYMMDD')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (err) {
      setError('Failed to export data.');
      console.error('Export error:', err);
    } finally {
      setExportingCsv(false);
    }
  };

  const handleExportPdf = async () => {
    setExportingPdf(true);
    try {
      const startDate = dateRange?.[0]?.startOf('day').toISOString();
      const endDate = dateRange?.[1]?.endOf('day').toISOString();
      const allData = await lowRelevanceAPI.getResults(0, pagination.total, startDate, endDate);

      const doc = new jsPDF();
      const title = `Low Relevance Analysis: ${dateRange?.[0]?.format('YYYY-MM-DD') || 'Start'} to ${dateRange?.[1]?.format('YYYY-MM-DD') || 'End'}`;
      doc.text(title, 14, 20);

      // 1. Prepare data for summary and details
      const scoreTiers: { [key: string]: Set<string> } = {
        '0.6 - 0.65': new Set(),
        '0.5 - 0.6': new Set(),
        '0.4 - 0.5': new Set(),
        '< 0.4': new Set(),
      };
      const detailedAnalysis: { [query: string]: LowRelevanceResult[] } = {};
      const seenAnswers = new Set<string>();

      allData.data.forEach(summary => {
        summary.results.forEach(detail => {
          const score = detail.relevance_score;
          if (score >= 0.6) scoreTiers['0.6 - 0.65'].add(summary.query);
          else if (score >= 0.5) scoreTiers['0.5 - 0.6'].add(summary.query);
          else if (score >= 0.4) scoreTiers['0.4 - 0.5'].add(summary.query);
          else scoreTiers['< 0.4'].add(summary.query);

          const answerKey = `${summary.query}|${detail.content?.substring(0, 200)}|${detail.relevance_score.toFixed(4)}`;
          if (!seenAnswers.has(answerKey)) {
            if (!detailedAnalysis[summary.query]) {
              detailedAnalysis[summary.query] = [];
            }
            detailedAnalysis[summary.query].push(detail);
            seenAnswers.add(answerKey);
          }
        });
      });

      // 2. Add Summary Section
      doc.setFontSize(16);
      doc.text('Summary - Query Distribution by Relevance Score', 14, 35);
      autoTable(doc, {
        startY: 40,
        head: [['Score Tier', 'Queries']],
        body: Object.entries(scoreTiers).map(([tier, queries]) => [tier, Array.from(queries).map(q => `• ${q}`).join('\n')]),
        theme: 'striped',
      });

      // 3. Add Detailed Analysis Section
      doc.addPage();
      doc.text('Detailed Query Analysis', 14, 20);
      let lastY = 25;

      for (const query in detailedAnalysis) {
        if (Object.prototype.hasOwnProperty.call(detailedAnalysis, query)) {
          const answers = detailedAnalysis[query];
          doc.setFontSize(12);
          doc.text(`Query: ${query}`, 14, lastY + 10);
          
          const tableBody = answers.map(ans => [
            ans.section_name || 'N/A',
            ans.title || 'N/A',
            ans.relevance_score.toFixed(4),
            ans.content?.substring(0, 200) || 'N/A',
          ]);

          autoTable(doc, {
            startY: lastY + 15,
            head: [['Source Section', 'Source Title', 'Relevance Score', 'Content (Truncated)']],
            body: tableBody,
            didDrawPage: (data) => {
              lastY = data.cursor?.y || 25;
            }
          });
          lastY = (doc as any).lastAutoTable.finalY + 5;
        }
      }

      doc.save(`low-relevance-report-${dayjs().format('YYYYMMDD')}.pdf`);

    } catch (err) {
      setError('Failed to export PDF.');
      console.error('PDF Export error:', err);
    } finally {
      setExportingPdf(false);
    }
  };

  const expandedRowRender = (record: LowRelevanceSummary) => {
    const columns: ColumnsType<LowRelevanceResult> = [
      {
        title: 'Content',
        dataIndex: 'content',
        key: 'content',
        width: '40%',
        render: (text) => <Paragraph ellipsis={{ rows: 2 }}>{text || 'N/A'}</Paragraph>
      },
      { title: 'Section Name', dataIndex: 'section_name', key: 'section_name', width: '20%' },
      { title: 'Page Title', dataIndex: 'title', key: 'title', width: '20%' },
      { title: 'Relevance', dataIndex: 'relevance_score', key: 'relevance_score', width: 120, sorter: (a, b) => a.relevance_score - b.relevance_score, render: (score) => <Tag color={score < 0.3 ? 'red' : 'orange'}>{score.toFixed(3)}</Tag> },
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

  const rangePresets: {
    label: string;
    value: [Dayjs, Dayjs];
  }[] = [
    { label: 'Recent Week', value: [dayjs().subtract(7, 'd'), dayjs()] },
    { label: 'Recent Month', value: [dayjs().subtract(1, 'month'), dayjs()] },
    { label: 'Recent 3 Months', value: [dayjs().subtract(3, 'month'), dayjs()] },
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
        <p className="text-gray-600">Grouped analysis of queries with low relevance scores, sorted by most recent occurrence.</p>
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
          <Space>
            <RangePicker presets={rangePresets} onChange={handleDateChange} />
            <Button 
              icon={<DownloadOutlined />} 
              onClick={handleExportCsv}
              loading={exportingCsv}
              disabled={data.length === 0}
            >
              Export CSV
            </Button>
            <Button 
              icon={<FilePdfOutlined />} 
              onClick={handleExportPdf}
              loading={exportingPdf}
              disabled={data.length === 0}
            >
              Export PDF
            </Button>
          </Space>
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
            <p><strong>Index:</strong> {selectedRecord.original_index}</p>
            <p><strong>Page ID:</strong> {selectedRecord.page_id || 'N/A'}</p>
            <p><strong>Section Name:</strong> {selectedRecord.section_name || 'N/A'}</p>
            <p><strong>Page Title:</strong> {selectedRecord.title || 'N/A'}</p>
            <p><strong>Relevance Score:</strong> {selectedRecord.relevance_score.toFixed(4)}</p>
            <p><strong>Created At:</strong> {dayjs(selectedRecord.created_at).format('YYYY-MM-DD HH:mm:ss')}</p>
            <p><strong>Content:</strong></p>
            <div className="prose prose-sm max-w-none p-2 border rounded bg-gray-50" style={{ wordBreak: 'break-word' }}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {selectedRecord.content || '*No content available*'}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default LowRelevanceAnalysis;