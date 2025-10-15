import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { X, Plus, Filter, ChevronsUpDown } from 'lucide-react';

export interface FilterCondition {
    id: string;
    field: string;
    operator: string;
    value: string;
    logicalOperator: 'OR' | 'AND';
}

const generalOperatorOptions = [
    'Is',
    'Is not',
    'Is set',
    'Is not set',
]

const operatorOptions = {
    NUMERIC: [
        ...generalOperatorOptions,
        'Higher than',
        'Lower than'
    ],
    STRING: [
        ...generalOperatorOptions,
        'Contains',
        'Does not contain'
    ],
}

const FilterMenu: React.FC<{ filters: FilterCondition[], setFilters: React.Dispatch<React.SetStateAction<FilterCondition[]>> }> = ({ filters, setFilters }) => {
    const fields = [
        {
            'name': 'Level', operatorOptions: operatorOptions.NUMERIC, options: [
                { label: 'Junior (0.59)', value: '0.59' },
                { label: 'Intermediate (0.78)', value: '0.78' },
                { label: 'Senior (1)', value: '1' },
                { label: 'Staff (1.2)', value: '1.2' }
            ]
        },
        {
            'name': 'Step', operatorOptions: operatorOptions.NUMERIC, options: [
                { label: 'Learning (0.85-0.94)', value: 'Learning' },
                { label: 'Established (0.95-1.04)', value: 'Established' },
                { label: 'Thriving (1.05-1.1)', value: 'Thriving' },
                { label: 'Expert (1.11-1.2)', value: 'Expert' }
            ]
        },
        {
            'name': 'Priority', operatorOptions: operatorOptions.STRING, options: [
                { label: 'Low', value: 'low' },
                { label: 'Medium', value: 'medium' },
                { label: 'High', value: 'high' }
            ]
        },
        {
            'name': 'Reviewer', operatorOptions: operatorOptions.STRING, options: [
                { label: 'Mother of Hedgehogs', value: 'Mother of Hedgehogs' },
                { label: 'Father of Hedgehogs', value: 'Father of Hedgehogs' }
            ]
        }
    ]

    const addFilter = () => {
        const newFilter: FilterCondition = {
            id: Date.now().toString(),
            field: '',
            operator: operatorOptions.NUMERIC[0],
            value: '',
            logicalOperator: 'AND'
        };
        setFilters((prevFilters: FilterCondition[]) => [...prevFilters, newFilter]);
    }

    const removeFilter = (id: string) => {
        setFilters((prevFilters: FilterCondition[]) => prevFilters.filter((filter: FilterCondition) => filter.id !== id));
    }

    const updateFilter = (id: string, field: keyof FilterCondition, value: string) => {
        setFilters((prevFilters: FilterCondition[]) => prevFilters.map((filter: FilterCondition) =>
            filter.id === id ? { ...filter, [field]: value } : filter
        ));
    }

    const toggleLogicalOperator = (id: string) => {
        setFilters((prevFilters: FilterCondition[]) => prevFilters.map((filter: FilterCondition) =>
            filter.id === id ? { ...filter, logicalOperator: filter.logicalOperator === 'AND' ? 'OR' : 'AND' } : filter
        ));
    }

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
                                                {fields.map(({ name }) => (
                                                    <SelectItem key={name} value={name} className="text-xs">
                                                        {name}
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
                                                    <SelectTrigger className="w-20 h-8 text-xs flex-1">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {fields.find(({ name }) => name === filter.field)?.operatorOptions.map((operator) => (
                                                            <SelectItem key={operator} value={operator} className="text-xs">
                                                                {operator}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>

                                                {['Is', 'Is not'].includes(filter.operator) ? (
                                                    <Select
                                                        value={filter.value}
                                                        onValueChange={(value) => updateFilter(filter.id, 'value', value)}
                                                    >
                                                        <SelectTrigger className="w-full h-8 text-xs flex-1">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {fields.find(({ name }) => name === filter.field)?.options.map((option) => (
                                                                <SelectItem key={option.value} value={option.value} className="text-xs">
                                                                    {option.label}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                ) : null}

                                                {/* TODO: Add numeric and string filters here */}
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
}

export const convertFiltersToPrismaWhere = (filters: FilterCondition[]) => {
    if (filters.length === 0) return {};

    const whereConditions = filters.map((filter) => {
        const field = filter.field.toLowerCase();
        const operator = filter.operator;
        const value = filter.value;

        switch (operator) {
            case 'Is':
                return { [field]: value };
            case 'Is not':
                return { [field]: { not: value } };
            case 'Is set':
                return { [field]: { not: null } };
            case 'Is not set':
                return { [field]: null };
            default:
                return {};
        }
    });

    let whereClause: any = whereConditions[0];

    for (let i = 1; i < whereConditions.length; i++) {
        const logicalOperator = filters[i].logicalOperator;
        const condition = whereConditions[i];

        if (logicalOperator === 'AND') {
            whereClause = {
                AND: [whereClause, condition]
            };
        } else if (logicalOperator === 'OR') {
            whereClause = {
                OR: [whereClause, condition]
            };
        }
    }

    return whereClause;
};

export default FilterMenu;
