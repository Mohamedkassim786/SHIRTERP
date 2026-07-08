import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {  Search, Plus, ChevronLeft, ChevronRight, AlertCircle  } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Column {
  key: string;
  label: string;
  render?: (row: any) => React.ReactNode;
}

interface DataTableProps {
  columns: Column[];
  data: any[];
  searchKey?: string;
  onAdd?: () => void;
  onEdit?: (row: any) => void;
  isLoading?: boolean;
  error?: any;
  addLabel?: string;
}

export function DataTable({ columns, data, onAdd, onEdit, isLoading, error, addLabel = 'Add New' }: DataTableProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ROWS_PER_PAGE = 10;

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setCurrentPage(1);
  };

  const filteredData = search
    ? data.filter(item =>
        columns.some(col =>
          String(item[col.key] || '').toLowerCase().includes(search.toLowerCase())
        )
      )
    : data;

  const totalPages = Math.ceil(filteredData.length / ROWS_PER_PAGE);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * ROWS_PER_PAGE,
    currentPage * ROWS_PER_PAGE
  );

  return (
    <div className="space-y-4 animate-slide-up">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between gap-3">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder={t('common.search', 'Search...')}
            value={search}
            onChange={handleSearch}
            className="pl-9 h-10 bg-white border-slate-200 text-sm rounded-xl"
          />
        </div>
        {onAdd && (
          <Button
            onClick={onAdd}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-200/50 h-10 rounded-xl font-semibold text-sm"
          >
            <Plus className="h-4 w-4 mr-2" /> {addLabel}
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-slate-200">
                {columns.map(col => (
                  <TableHead
                    key={col.key}
                    className="text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-50 py-3.5 px-5"
                  >
                    {col.label}
                  </TableHead>
                ))}
                {onEdit && (
                  <TableHead className="text-right text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-50 py-3.5 px-5">
                    Actions
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={`skeleton-${i}`} className="border-slate-100">
                    {columns.map(col => (
                      <TableCell key={col.key} className="py-4 px-5">
                        <div className="h-4 bg-slate-100 rounded-lg animate-pulse w-3/4" />
                      </TableCell>
                    ))}
                    {onEdit && (
                      <TableCell className="py-4 px-5">
                        <div className="h-4 bg-slate-100 rounded-lg animate-pulse w-12 ml-auto" />
                      </TableCell>
                    )}
                  </TableRow>
                ))
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={columns.length + (onEdit ? 1 : 0)} className="text-center py-14">
                    <div className="flex flex-col items-center gap-2.5">
                      <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center">
                        <AlertCircle className="h-6 w-6 text-red-500" />
                      </div>
                      <p className="text-sm font-semibold text-red-600">Error loading data</p>
                      <p className="text-xs text-slate-400">{error.message || 'Please try again'}</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length + (onEdit ? 1 : 0)} className="text-center py-14">
                    <div className="flex flex-col items-center gap-2.5">
                      <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center">
                        <Search className="h-5 w-5 text-slate-300" />
                      </div>
                      <p className="text-sm font-semibold text-slate-500">{t('common.noRecords', 'No records found')}</p>
                      {search && <p className="text-xs text-slate-400">Try a different search term</p>}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((row, i) => (
                  <TableRow key={row.id || i} className="group hover:bg-blue-50/30 transition-colors border-slate-100">
                    {columns.map(col => (
                      <TableCell key={col.key} className="py-3.5 px-5 text-sm text-slate-700">
                        {col.render ? col.render(row) : row[col.key]}
                      </TableCell>
                    ))}
                    {onEdit && (
                      <TableCell className="text-right py-3.5 px-5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(row)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-600 hover:text-blue-700 hover:bg-blue-50 text-xs font-semibold h-8 px-3 rounded-lg"
                        >
                          Edit
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {!isLoading && !error && filteredData.length > ROWS_PER_PAGE && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/50">
            <p className="text-xs text-slate-500 font-medium">
              Showing{' '}
              <span className="font-bold text-slate-700">{(currentPage - 1) * ROWS_PER_PAGE + 1}</span>
              {' '}–{' '}
              <span className="font-bold text-slate-700">{Math.min(currentPage * ROWS_PER_PAGE, filteredData.length)}</span>
              {' '}of{' '}
              <span className="font-bold text-slate-700">{filteredData.length}</span> results
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="h-8 w-8 p-0 rounded-lg border-slate-200"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs font-semibold text-slate-600 min-w-[80px] text-center">
                Page {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="h-8 w-8 p-0 rounded-lg border-slate-200"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
