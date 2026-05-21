'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Database, Upload, RefreshCw, Filter, Search, Download, Trash2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { api } from '@/services/api';

interface DataSource {
  id: string;
  name: string;
  type: string;
  record_count: number;
  last_synced_at: string;
  status: string;
}

interface DataSourceStats {
  totalRecords: number;
  dataSources: number;
  processingQueue: number;
  storageUsed: string;
}

export default function DataManagementPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [stats, setStats] = useState<DataSourceStats>({ totalRecords: 0, dataSources: 0, processingQueue: 0, storageUsed: '0 GB' });
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [sources, statsData] = await Promise.all([
        api.get<DataSource[]>(`/data-sources${searchQuery ? `?search=${searchQuery}` : ''}`),
        api.get<DataSourceStats>('/data-sources/stats'),
      ]);
      setDataSources(sources);
      setStats(statsData);
    } catch {
      toast.error('Failed to load data sources');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const handleSearch = () => {
    loadData();
  }

  const handleUpload = () => {
    toast.success('Upload started', {
      description: 'Your data file is being processed.'
    });
  }

  const handleRefresh = async (sourceId: string) => {
    try {
      await api.post(`/data-sources/${sourceId}/sync`);
      toast.success('Data source refreshed', {
        description: 'Latest data has been synchronized.'
      });
      loadData();
    } catch {
      toast.error('Failed to refresh data source');
    }
  }

  const handleDelete = async (sourceId: string) => {
    try {
      await api.delete(`/data-sources/${sourceId}`);
      setDataSources(prev => prev.filter(s => s.id !== sourceId));
      toast.success('Data source deleted');
    } catch {
      toast.error('Failed to delete data source');
    }
  }

  const formatRecords = (count: number) => {
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  }

  const formatLastUpdated = (dateStr: string) => {
    const date = new Date(dateStr);
    const diff = Date.now() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes} minutes ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hours ago`;
    return `${Math.floor(hours / 24)} days ago`;
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-neutral-800 rounded-xl flex items-center justify-center flex-shrink-0">
            <Database className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Data Management</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Collection, processing, and data sources</p>
          </div>
        </div>
        <Button
          className="w-full md:w-auto bg-neutral-800 hover:bg-neutral-900 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
          onClick={handleUpload}
        >
          <Upload className="w-4 h-4 mr-2" />
          Upload Data
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Records', value: formatRecords(stats.totalRecords), icon: Database },
          { label: 'Data Sources', value: stats.dataSources.toString(), icon: Database },
          { label: 'Processing Queue', value: stats.processingQueue.toString(), icon: RefreshCw },
          { label: 'Storage Used', value: stats.storageUsed, icon: Database }
        ].map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <Icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-semibold text-foreground">{stat.value}</p>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Search and Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search data sources..."
              className="pl-10"
            />
          </div>
          <Button variant="outline" onClick={handleSearch} className="w-full sm:w-auto">
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
        </div>
      </Card>

      {/* Data Sources Table */}
      <Card className="overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-neutral-200">
          <h3 className="font-semibold text-foreground">Data Sources</h3>
          <p className="text-sm text-muted-foreground mt-1">Manage your connected data sources and pipelines</p>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">Source Name</TableHead>
                <TableHead className="whitespace-nowrap">Type</TableHead>
                <TableHead className="whitespace-nowrap">Records</TableHead>
                <TableHead className="whitespace-nowrap">Last Updated</TableHead>
                <TableHead className="whitespace-nowrap">Status</TableHead>
                <TableHead className="whitespace-nowrap">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
                </TableRow>
              ) : (
                dataSources.map((source, index) => (
                  <motion.tr
                    key={source.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-b border-neutral-100"
                  >
                    <TableCell className="font-medium whitespace-nowrap">{source.name}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      <Badge variant="outline">{source.type.toUpperCase()}</Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{source.record_count.toLocaleString()}</TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{formatLastUpdated(source.last_synced_at)}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {source.status === 'active' ? (
                        <Badge className="bg-green-100 text-green-700 border-green-200">Active</Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-700 border-amber-200">Syncing</Badge>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRefresh(source.id)}
                        >
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost">
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(source.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </motion.tr>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Data Processing Pipeline */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
            <Database className="w-5 h-5 text-blue-600" />
          </div>
          <h3 className="font-semibold text-foreground mb-2">Data Collection</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Automated collection from multiple sources including APIs, databases, and file uploads.
          </p>
          <Button variant="outline" size="sm" className="w-full">
            Configure Sources
          </Button>
        </Card>

        <Card className="p-6">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
            <RefreshCw className="w-5 h-5 text-purple-600" />
          </div>
          <h3 className="font-semibold text-foreground mb-2">Data Processing</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Clean, transform, and validate data using automated processing pipelines.
          </p>
          <Button variant="outline" size="sm" className="w-full">
            View Pipeline
          </Button>
        </Card>

        <Card className="p-6">
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-4">
            <Database className="w-5 h-5 text-green-600" />
          </div>
          <h3 className="font-semibold text-foreground mb-2">Data Storage</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Secure, structured storage with version control and backup capabilities.
          </p>
          <Button variant="outline" size="sm" className="w-full">
            Manage Storage
          </Button>
        </Card>
      </div>
    </div>
  );
}
