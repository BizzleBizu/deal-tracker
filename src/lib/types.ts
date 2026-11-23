export type Priority = "must_have" | "nice_to_have" | "only_if_cheap";

export type Item = {
  id: string;
  name: string;
  priority: Priority;
  target_price: number | null;
  status: string;
};

export const PRIORITY_LABEL: Record<Priority, string> = {
  must_have: "Must-have",
  nice_to_have: "Nice-to-have",
  only_if_cheap: "Only if cheap",
};

export const PRIORITY_ORDER: Record<Priority, number> = {
  must_have: 0,
  nice_to_have: 1,
  only_if_cheap: 2,
};

export const PRIORITY_COLOR: Record<Priority, string> = {
  must_have: "text-red-700 bg-red-50",
  nice_to_have: "text-blue-700 bg-blue-50",
  only_if_cheap: "text-gray-600 bg-gray-100",
};