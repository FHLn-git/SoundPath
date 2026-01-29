// Pagination utilities for large datasets
import { useState } from 'react'

export const DEFAULT_PAGE_SIZE = 50
export const MAX_PAGE_SIZE = 100

export const createPagination = (page = 1, pageSize = DEFAULT_PAGE_SIZE) => {
  const limit = Math.min(pageSize, MAX_PAGE_SIZE)
  const offset = (page - 1) * limit

  return {
    page,
    limit,
    offset,
    hasMore: total => offset + limit < total,
    totalPages: total => Math.ceil(total / limit),
  }
}

export const usePagination = (initialPage = 1, initialPageSize = DEFAULT_PAGE_SIZE) => {
  const [page, setPage] = useState(initialPage)
  const [pageSize, setPageSize] = useState(initialPageSize)

  const pagination = createPagination(page, pageSize)

  const nextPage = () => setPage(p => p + 1)
  const prevPage = () => setPage(p => Math.max(1, p - 1))
  const goToPage = newPage => setPage(Math.max(1, newPage))
  const changePageSize = newSize => {
    setPageSize(Math.min(newSize, MAX_PAGE_SIZE))
    setPage(1) // Reset to first page
  }

  return {
    ...pagination,
    page,
    pageSize,
    nextPage,
    prevPage,
    goToPage,
    changePageSize,
  }
}
