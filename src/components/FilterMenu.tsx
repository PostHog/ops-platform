import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { X, Plus, Filter, ChevronsUpDown } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { Prisma, Salary } from 'generated/prisma/client';

export interface FilterCondition {
    id: string;
    field: string;
    operator: string;
    value: string;
    logicalOperator: 'OR' | 'AND';
}

type Employee = Prisma.EmployeeGetPayload<{
    include: {
        salaries: {
            orderBy: {
                timestamp: 'desc'
            }
        }
    }
}>

const FilterMenu: React.FC<{ employees: Employee[], columns: ColumnDef<Employee>[], filters: FilterCondition[], setFilters: (filters: FilterCondition[]) => void }> = ({ employees, columns, filters, setFilters }) => {
    const fieldOptions = columns.filter(column => column.header).map(column => column.header).filter(x => ['Name', 'Level', 'Step', 'Priority', 'Reviewer'].includes(x));

    const operatorOptions = [
        'Is',
        'Is not',
        'Is set',
        'Is not set',
    ];

    const addFilter = () => {
        const newFilter: FilterCondition = {
            id: Date.now().toString(),
            field: '',
            operator: operatorOptions[0],
            value: '',
            logicalOperator: 'AND'
        };
        setFilters([...filters, newFilter]);
    };

    const removeFilter = (id: string) => {
        setFilters([...filters.filter(filter => filter.id !== id)]);
    };

    const updateFilter = (id: string, field: keyof FilterCondition, value: string) => {
        setFilters(filters.map(filter =>
            filter.id === id ? { ...filter, [field]: value } : filter
        ));
    };

    const toggleLogicalOperator = (id: string) => {
        setFilters(filters.map(filter =>
            filter.id === id ? { ...filter, logicalOperator: filter.logicalOperator === 'AND' ? 'OR' : 'AND' } : filter
        ));
    };

    const getOptions = (field: string) => {
        let options: any = employees.map(employee => employee[field.toLowerCase() as keyof Employee]).filter(x => x)

        if (options.length === 0) {
            options = employees.map(employee => employee.salaries[0][field.toLowerCase() as keyof Salary])
        }

        return [...new Set(options)]
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" className="ml-auto">
                    <Filter className="mr-2 h-4 w-4" />
                    Filters
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-3xl p-0">
                <div className="bg-white rounded-lg shadow-lg border p-6 w-full">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters</h3>

                    <div className="space-y-3">
                        {filters.map((filter, index) => (
                            <div key={filter.id}>
                                <div className="flex items-center justify-between gap-2">
                                    {index === 0 ? (
                                        <span className="text-sm font-medium text-gray-700 min-w-[48px]">Where</span>
                                    ) : (
                                        <div className="w-12 cursor-pointer flex justify-center items-center">
                                            <div
                                                onClick={() => toggleLogicalOperator(filter.id)}
                                                className="select-none overflow-hidden rounded border-[#d6d9de] text-xs border flex flex-row h-6 w-full flex justify-center items-center"
                                            >
                                                <div
                                                    className={`flex flex-col h-12 transition-all duration-500 relative ${filter.logicalOperator === 'AND' ? 'top-[-12px]' : 'top-[12px]'
                                                        }`}
                                                >
                                                    <div className="flex justify-center items-center pl-1 h-6 font-medium">
                                                        <span>OR</span>
                                                    </div>
                                                    <div className="flex justify-center items-center pl-1 h-6 font-medium">
                                                        <span>AND</span>
                                                    </div>
                                                </div>
                                                <ChevronsUpDown />
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-center justify-start gap-2 w-full">
                                        <Select
                                            value={filter.field}
                                            onValueChange={(value) => updateFilter(filter.id, 'field', value)}
                                        >
                                            <SelectTrigger className="w-[220px] h-8 text-xs">
                                                <SelectValue placeholder="Select filter" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {fieldOptions.map((option) => (
                                                    <SelectItem key={option} value={option} className="text-xs">
                                                        {option}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>

                                        {filter.field && (
                                            <>
                                                <Select
                                                    value={filter.operator}
                                                    onValueChange={(value) => updateFilter(filter.id, 'operator', value)}
                                                >
                                                    <SelectTrigger className="w-20 h-8 text-xs">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {operatorOptions.map((option) => (
                                                            <SelectItem key={option} value={option} className="text-xs">
                                                                {option}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>

                                                {!['Is not set', 'Is set'].includes(filter.operator) ? (
                                                    <div className="flex-1">
                                                        <Select
                                                            value={filter.value}
                                                            onValueChange={(value) => updateFilter(filter.id, 'value', value)}
                                                        >
                                                            <SelectTrigger className="w-full h-8 text-xs">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {getOptions(filter.field).map((option) => (
                                                                    <SelectItem key={option} value={option} className="text-xs">
                                                                        {option}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>

                                                ) : null}
                                            </>
                                        )}
                                    </div>

                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeFilter(filter.id)}
                                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={addFilter}
                        className="text-sm mt-4 flex items-center gap-1"
                    >
                        <Plus className="h-4 w-4" />
                        Add filter
                    </button>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export default FilterMenu;
