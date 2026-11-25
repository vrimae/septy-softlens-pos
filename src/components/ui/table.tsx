"use client"

import * as React from "react"
import { cn } from "cn"

function Table({ className, ...props }: React.ComponentProps<"table">) {
  const topScrollRef = React.useRef<HTMLDivElement>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const tableRef = React.useRef<HTMLTableElement>(null)
  const [contentWidth, setContentWidth] = React.useState(0)
  const [hasOverflow, setHasOverflow] = React.useState(false)
  const syncingRef = React.useRef(false)

  React.useEffect(() => {
    const container = containerRef.current
    const table = tableRef.current
    if (!container || !table) return

    const update = () => {
      const sw = Math.max(container.scrollWidth, table.scrollWidth)
      const cw = container.clientWidth
      setContentWidth(sw)
      setHasOverflow(sw > cw + 2)
    }

    update()
    const ro = new ResizeObserver(update)
    ro.observe(container)
    ro.observe(table)
    window.addEventListener("resize", update)
    return () => {
      ro.disconnect()
      window.removeEventListener("resize", update)
    }
  }, [])

  const onTopScroll = () => {
    if (syncingRef.current) return
    syncingRef.current = true
    if (containerRef.current && topScrollRef.current) {
      containerRef.current.scrollLeft = topScrollRef.current.scrollLeft
    }
    requestAnimationFrame(() => {
      syncingRef.current = false
    })
  }

  const onBottomScroll = () => {
    if (syncingRef.current) return
    syncingRef.current = true
    if (topScrollRef.current && containerRef.current) {
      topScrollRef.current.scrollLeft = containerRef.current.scrollLeft
    }
    requestAnimationFrame(() => {
      syncingRef.current = false
    })
  }

  return (
    <div className="relative w-full">
      {hasOverflow && (
        <div
          ref={topScrollRef}
          onScroll={onTopScroll}
          aria-label="Scroll horizontal tabel"
          className="w-full overflow-x-scroll overflow-y-hidden border-b border-gray-100 dark:border-gray-800/60 py-0.5"
        >
          <div style={{ width: contentWidth, height: 1 }} />
        </div>
      )}
      <div
        ref={containerRef}
        onScroll={onBottomScroll}
        data-slot="table-container"
        className="relative w-full max-h-[70vh] overflow-x-scroll overflow-y-auto pb-1"
      >
        <table
          ref={tableRef}
          data-slot="table"
          className={cn("w-full caption-bottom text-sm", className)}
          {...props}
        />
      </div>
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("sticky top-0 z-10 bg-white dark:bg-[#13151a] [&_tr]:border-b", className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
        className
      )}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-b transition-colors hover:bg-muted/50 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted",
        className
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "h-10 px-2 text-left align-middle font-medium whitespace-nowrap text-foreground [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
