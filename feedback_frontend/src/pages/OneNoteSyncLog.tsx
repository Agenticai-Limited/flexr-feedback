import React, { useState, useEffect } from "react";
import {
  Table,
  Spin,
  Typography,
  Tabs,
  Alert,
  Pagination,
  Card,
} from "antd";
import type { TabsProps, TableProps } from "antd";
import { oneNoteSyncLogAPI } from "../services/api";
import {
  OneNoteSyncStat,
  OneNoteSyncRunDetail,
  OneNotePageDetail,
  PaginatedOneNoteSyncStatsResponse,
} from "../types";

const { Title, Text } = Typography;

const PageDetailTable: React.FC<{ pages: OneNotePageDetail[] }> = ({
  pages,
}) => {
  const columns: TableProps<OneNotePageDetail>["columns"] = [
    {
      title: "Section Name",
      dataIndex: "section_name",
      key: "section_name",
    },
    { title: "Page Title", dataIndex: "title", key: "title" },
  ];

  return (
    <Table
      columns={columns}
      dataSource={pages}
      rowKey="page_id"
      pagination={false}
      size="small"
    />
  );
};

const ExpandedRow: React.FC<{ syncRunId: string }> = ({ syncRunId }) => {
  const [detail, setDetail] = useState<OneNoteSyncRunDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        setLoading(true);
        const response = await oneNoteSyncLogAPI.getDetails(syncRunId);
        setDetail(response);
        setError(null);
      } catch (err) {
        console.error("Failed to fetch sync run details", err);
        setError("Failed to load details. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [syncRunId]);

  if (loading) {
    return <Spin />;
  }

  if (error) {
    return <Alert message={error} type="error" showIcon />;
  }

  if (!detail) {
    return <Text>No details available.</Text>;
  }

  const tabItems: TabsProps["items"] = [
    {
      key: "1",
      label: `Created (${detail.created_pages.length})`,
      children: <PageDetailTable pages={detail.created_pages} />,
    },
    {
      key: "2",
      label: `Updated (${detail.updated_pages.length})`,
      children: <PageDetailTable pages={detail.updated_pages} />,
    },
    {
      key: "3",
      label: `Deleted (${detail.deleted_pages.length})`,
      children: <PageDetailTable pages={detail.deleted_pages} />,
    },
  ];

  return <Tabs defaultActiveKey="1" items={tabItems} />;
};

const OneNoteSyncLogPage: React.FC = () => {
  const [stats, setStats] = useState<OneNoteSyncStat[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const response: PaginatedOneNoteSyncStatsResponse =
          await oneNoteSyncLogAPI.getStats(page, pageSize);
        setStats(response.data);
        setTotal(response.total);
        setError(null);
      } catch (err) {
        console.error("Failed to fetch OneNote sync stats", err);
        setError("Failed to load sync statistics. Please refresh the page.");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [page, pageSize]);

  const columns: TableProps<OneNoteSyncStat>["columns"] = [
    {
      title: "Sync Run ID",
      dataIndex: "sync_run_id",
      key: "sync_run_id",
    },
    {
      title: "Sync Date",
      dataIndex: "sync_date",
      key: "sync_date",
    },
    {
      title: "Pages Created",
      dataIndex: "created_count",
      key: "created_count",
      align: "right",
    },
    {
      title: "Pages Updated",
      dataIndex: "updated_count",
      key: "updated_count",
      align: "right",
    },
    {
      title: "Pages Deleted",
      dataIndex: "deleted_count",
      key: "deleted_count",
      align: "right",
    },
  ];

  return (
    <Card>
      <Title level={4} style={{ marginBottom: "24px" }}>
        OneNote Sync Logs
      </Title>
      {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} />}
      <Spin spinning={loading}>
        <Table
          columns={columns}
          dataSource={stats}
          rowKey="sync_run_id"
          pagination={false}
          expandable={{
            expandedRowRender: (record) => (
              <ExpandedRow syncRunId={record.sync_run_id} />
            ),
            rowExpandable: (record) =>
              record.created_count +
                record.updated_count +
                record.deleted_count >
              0,
          }}
        />
      </Spin>
      <Pagination
        current={page}
        pageSize={pageSize}
        total={total}
        onChange={(p, ps) => {
          setPage(p);
          setPageSize(ps);
        }}
        showSizeChanger
        pageSizeOptions={["10", "20", "50"]}
        style={{ marginTop: 16, textAlign: "right" }}
      />
    </Card>
  );
};

export default OneNoteSyncLogPage;