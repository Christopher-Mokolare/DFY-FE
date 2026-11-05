interface PaginationProps {
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
  onPageChange: (page: number) => void
  label: string
}

export default function Pagination({
  page,
  pageSize,
  totalCount,
  totalPages,
  onPageChange,
  label,
}: PaginationProps) {
  if (totalCount === 0) return null

  const firstItem = (page - 1) * pageSize + 1
  const lastItem = Math.min(page * pageSize, totalCount)
  const visiblePages = [...new Set([1, page - 1, page, page + 1, totalPages])]
    .filter(pageNumber => pageNumber >= 1 && pageNumber <= totalPages)
    .sort((a, b) => a - b)

  return (
    <div className="clean-pagination">
      <span className="clean-pagination-summary">
        Showing {firstItem}–{lastItem} of {totalCount} {label}
      </span>
      {totalPages > 1 && (
        <nav className="pagination" aria-label={`${label} pages`}>
          <button
            className="page-btn"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            aria-label="Previous page"
          >
            <i className="fas fa-chevron-left" />
          </button>
          {visiblePages.map((pageNumber, index) => (
            <span className="clean-pagination-slot" key={pageNumber}>
              {index > 0 && pageNumber - visiblePages[index - 1] > 1 && (
                <span className="clean-pagination-ellipsis" aria-hidden="true">…</span>
              )}
              <button
                className={`page-btn ${pageNumber === page ? 'active' : ''}`}
                onClick={() => onPageChange(pageNumber)}
                aria-current={pageNumber === page ? 'page' : undefined}
                aria-label={`Page ${pageNumber}`}
              >
                {pageNumber}
              </button>
            </span>
          ))}
          <button
            className="page-btn"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            aria-label="Next page"
          >
            <i className="fas fa-chevron-right" />
          </button>
        </nav>
      )}
    </div>
  )
}
