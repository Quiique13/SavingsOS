// Historical accounts are explicit test records, not new-profile defaults.
export function fixtureAccounts() {
  return [
    { id: "bleap", name: "Bleap", provider: "Everyday spending", kind: "Spending", balance: 0, color: "#a4d17a" },
    { id: "moey", name: "moey!", provider: "Crédito Agrícola", kind: "Subscriptions", balance: 0, color: "#ae9cda" },
    { id: "trading", name: "Trading 212", provider: "Savings & investments", kind: "Savings", balance: 0, color: "#b2cbd5" },
  ];
}
