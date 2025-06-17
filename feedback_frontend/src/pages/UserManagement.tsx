import React, { useState, useEffect } from 'react';
import {
    Table,
    Card,
    Typography,
    Button,
    Modal,
    Form,
    Input,
    message,
    Spin,
    Alert,
    Tag,
    Space,
    Switch,
} from 'antd';
import { PlusOutlined, UserOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { userAPI } from '../services/api';
import { User, UserCreate } from '../types';

const { Title, Text } = Typography;

const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [form] = Form.useForm();
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 10,
        total: 0,
    });

    const fetchUsers = async (page = pagination.current, pageSize = pagination.pageSize) => {
        try {
            setLoading(true);
            const skip = (page - 1) * pageSize;
            const result = await userAPI.getUsers(skip, pageSize);
            setUsers(result);
            // This is a simplification. The API should ideally return a total count.
            setPagination(prev => ({ ...prev, total: result.length < pageSize ? skip + result.length : skip + result.length + 10 }));
        } catch (err) {
            setError('Failed to load users.');
            console.error('Failed to fetch users:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, [pagination.current, pagination.pageSize]);

    const showModal = () => {
        setIsModalVisible(true);
    };

    const handleCancel = () => {
        setIsModalVisible(false);
        form.resetFields();
    };

    const handleCreate = async (values: UserCreate) => {
        try {
            await userAPI.createUser(values);
            message.success('User created successfully');
            setIsModalVisible(false);
            form.resetFields();
            fetchUsers(1); // Refresh user list and go to first page
        } catch (err: any) {
            if (err.response && err.response.data && err.response.data.detail) {
                const errorMsg = err.response.data.detail;
                message.error(`Failed to create user: ${errorMsg}`);
            } else {
                message.error('An unknown error occurred while creating the user.');
            }
        }
    };

    const handleTableChange = (paginationConfig: any) => {
        setPagination({
            ...pagination,
            current: paginationConfig.current,
            pageSize: paginationConfig.pageSize,
        });
    };

    const columns: ColumnsType<User> = [
        {
            title: 'ID',
            dataIndex: 'id',
            key: 'id',
            width: 80,
        },
        {
            title: 'Username',
            dataIndex: 'username',
            key: 'username',
            render: (text: string) => <Tag icon={<UserOutlined />} color="blue">{text}</Tag>,
        },
        {
            title: 'Full Name',
            dataIndex: 'full_name',
            key: 'full_name',
            render: (text: string | null) => text || <Text type="secondary">N/A</Text>,
        },
        {
            title: 'Admin',
            dataIndex: 'is_admin',
            key: 'is_admin',
            width: 100,
            render: (isAdmin: boolean) => (
                <Tag icon={isAdmin ? <CheckCircleOutlined /> : <CloseCircleOutlined />} color={isAdmin ? 'success' : 'error'}>
                    {isAdmin ? 'Yes' : 'No'}
                </Tag>
            ),
        },
        {
            title: 'Created At',
            dataIndex: 'created_at',
            key: 'created_at',
            render: (text: string) => dayjs(text).format('YYYY-MM-DD HH:mm:ss'),
        },
    ];

    if (loading && users.length === 0) {
        return (
            <div className="p-6 flex justify-center items-center min-h-96">
                <Spin size="large" />
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <Title level={2} className="!mb-0">User Management</Title>
                <Button type="primary" icon={<PlusOutlined />} onClick={showModal}>
                    Create User
                </Button>
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
                <Table
                    columns={columns}
                    dataSource={users}
                    rowKey="id"
                    loading={loading}
                    pagination={pagination}
                    onChange={handleTableChange}
                    scroll={{ x: 'max-content' }}
                />
            </Card>

            <Modal
                title="Create a new user"
                visible={isModalVisible}
                onCancel={handleCancel}
                footer={null}
            >
                <Form form={form} layout="vertical" onFinish={handleCreate} autoComplete="off">
                    <Form.Item
                        name="username"
                        label="Username"
                        rules={[{ required: true, message: 'Please input the username!' }]}
                    >
                        <Input prefix={<UserOutlined />} />
                    </Form.Item>
                    <Form.Item
                        name="full_name"
                        label="Full Name"
                    >
                        <Input placeholder="Optional" />
                    </Form.Item>
                    <Form.Item
                        name="password"
                        label="Password"
                        rules={[{ required: true, message: 'Please input the password!' }]}
                    >
                        <Input.Password />
                    </Form.Item>
                    <Form.Item
                        name="is_admin"
                        label="Is Admin"
                        valuePropName="checked"
                    >
                        <Switch />
                    </Form.Item>
                    <Form.Item>
                        <Space>
                            <Button type="primary" htmlType="submit">
                                Submit
                            </Button>
                            <Button htmlType="button" onClick={handleCancel}>
                                Cancel
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default UserManagement; 