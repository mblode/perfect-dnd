import type { BlockData } from "@/types/block";

export const DEFAULT_PAGE_ID = "page-1";

/** Demo content. This app has no backend; the list ships with the bundle. */
export const MOCK_BLOCKS: BlockData[] = [
  {
    id: "block-1",
    title: "My Portfolio",
    type: "link",
    url: "https://portfolio.com",
    visible: true,
    order: 0,
    pageId: DEFAULT_PAGE_ID,
  },
  {
    id: "block-2",
    title: "About Me",
    type: "header",
    visible: true,
    order: 1,
    pageId: DEFAULT_PAGE_ID,
  },
  {
    id: "block-3",
    title: "Twitter",
    type: "link",
    url: "https://twitter.com",
    visible: true,
    order: 2,
    pageId: DEFAULT_PAGE_ID,
  },
  {
    id: "block-4",
    title: "Instagram",
    type: "link",
    url: "https://instagram.com",
    visible: false,
    order: 3,
    pageId: DEFAULT_PAGE_ID,
  },
  {
    id: "block-5",
    title: "Contact",
    type: "text",
    visible: true,
    order: 4,
    pageId: DEFAULT_PAGE_ID,
  },
];
