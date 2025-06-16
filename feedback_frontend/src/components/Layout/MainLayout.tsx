import React, { useState } from 'react';
import { Layout, Menu, Button, Avatar, Dropdown, Typography, Space } from 'antd';
import type { MenuProps } from 'antd';
import { 
  DashboardOutlined, 
  MessageOutlined, 
  FileTextOutlined, 
  ExclamationCircleOutlined,
  StopOutlined,
  UserOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Menu items configuration
  const menuItems: MenuProps['items'] = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
    },
    {
      key: '/feedback',
      icon: <MessageOutlined />,
      label: 'Feedback Management',
    },
    {
      key: '/qa-logs',
      icon: <FileTextOutlined />,
      label: 'QA Logs',
    },
    {
      key: '/low-similarity',
      icon: <ExclamationCircleOutlined />,
      label: 'Low Similarity Analysis',
    },
    {
      key: '/no-result',
      icon: <StopOutlined />,
      label: 'No Result Analysis',
    },
  ];

  // User dropdown menu
  const userMenuItems: MenuProps['items'] = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      onClick: () => {
        logout();
        navigate('/login');
      },
    },
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
  };

  return (
    <Layout className="min-h-screen">
      <Sider 
        trigger={null} 
        collapsible 
        collapsed={collapsed}
        className="bg-white shadow-md"
        width={250}
      >
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <DashboardOutlined className="text-white text-lg" />
            </div>
            {!collapsed && (
              <Title level={4} className="!mb-0 !text-gray-800">
                Admin System
              </Title>
            )}
          </div>
        </div>
        
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
          className="border-none mt-4"
        />
      </Sider>
      
      <Layout>
        <Header className="bg-white shadow-sm px-4 flex justify-between items-center">
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            className="text-lg w-16 h-16"
          />
          
          <Space>
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Button type="text" className="flex items-center space-x-2 h-auto p-2">
                <Avatar size="small" icon={<UserOutlined />} />
                <span className="hidden sm:inline">Admin User</span>
              </Button>
            </Dropdown>
          </Space>
        </Header>
        
        <Content className="p-6 bg-gray-50">
          <div className="bg-white rounded-lg shadow-sm min-h-[calc(100vh-140px)]">
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;