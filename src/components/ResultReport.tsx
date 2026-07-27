import React, { useState } from "react";
import { SimYearResult, SimSummary, PensionIncome, FinancialAssets, SimConditions } from "../types";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import { Table } from "lucide-react";

interface ResultReportProps {
  results: SimYearResult[];
  summary: SimSummary;
  pensionIncome: PensionIncome;
  financialAssets: FinancialAssets;
  conditions: SimConditions;
}

export const ResultReport: React.FC<ResultReportProps> = ({
  results,
  summary,
  pensionIncome,
  financialAssets,
  conditions
}) => {
  const [activeTab, setActiveTab] = useState<"trajectory" | "split">("trajectory");
  const [tableViewMode, setTableViewMode] = useState<"simple" | "detail">("simple");

  const formatNumber = (num: number) => {
    return num.toLocaleString("ko-KR");
  };

  const formatKoreanCurrency = (amount: number) => {
    if (amount === 0) return "0원";
    const eok = Math.floor(amount / 100000000);
    const man = Math.floor((amount % 100000000) / 10000);

    let result = "";
    if (eok > 0) result += `${eok}억 `;
    if (man > 0) result += `${man.toLocaleString("ko-KR")}만`;
    return result.trim() + "원";
  };

  // Convert numbers for chart display (to 만원 unit)
  const chartData = results.map((r) => ({
    ...r,
    ageLabel: `${r.age}세`,
    balanceMan: Math.round(r.balance / 10000),
    principalBalanceMan: Math.round(r.principalBalance / 10000),
    yieldBalanceMan: Math.round(r.yieldBalance / 10000),
    nationalPensionMan: Math.round(r.nationalPension / 10000),
    privatePensionMan: Math.round((r.privatePension || 0) / 10000),
    assetWithdrawalMan: Math.round((r.assetWithdrawal || 0) / 10000),
    monthlyTaxedMan: Math.round(r.monthlyTaxed / 10000)
  }));

  return (
    <div className="space-y-6" id="result-dashboard">
      {/* Recharts Trajectory & Composition */}
      <div className="bg-white border border-slate-100 rounded-2xl p-3 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-3 mb-4 gap-2">
          <div className="flex gap-1.5 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab("trajectory")}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-extrabold rounded-md transition-all cursor-pointer ${
                activeTab === "trajectory"
                  ? "bg-white text-indigo-950 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              종합 연금수급 추이 (구분 그래프)
            </button>
            <button
              onClick={() => setActiveTab("split")}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-extrabold rounded-md transition-all cursor-pointer ${
                activeTab === "split"
                  ? "bg-white text-indigo-950 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              자산 원금 / 수익금 추적
            </button>
          </div>
          <span className="text-[11px] sm:text-xs text-slate-500 font-bold">
            ※ 국민연금, 사적연금, 자산인출액 및 총수령액이 라인별로 정교하게 구분 표현됩니다.
          </span>
        </div>

        <div className="h-80 sm:h-96 w-full">
          {activeTab === "trajectory" ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284c7" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#0284c7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="ageLabel" tick={{ fontSize: 10, fill: "#475569", fontWeight: "bold" }} />
                <YAxis
                  yAxisId="left"
                  tickFormatter={(v) => (v >= 10000 ? `${(v / 10000).toFixed(1)}억` : `${formatNumber(v)}만`)}
                  tick={{ fontSize: 10, fill: "#0284c7", fontWeight: "bold" }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickFormatter={(v) => `${formatNumber(v)}만`}
                  tick={{ fontSize: 10, fill: "#4f46e5", fontWeight: "bold" }}
                />
                <Tooltip
                  formatter={(value: any, name: any) => {
                    if (name === "자산 총 잔액 (만원)") {
                      return [value >= 10000 ? `${(value / 10000).toFixed(2)}억원` : `${formatNumber(value)}만원`, name];
                    }
                    return [`${formatNumber(value)}만원`, name];
                  }}
                  contentStyle={{ fontSize: 11, borderRadius: 8, borderColor: "#cbd5e1" }}
                />
                <Legend wrapperStyle={{ fontSize: 11, fontWeight: "bold" }} />

                {/* Left Y Axis: Asset Balance */}
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="balanceMan"
                  name="자산 총 잔액 (만원)"
                  stroke="#0284c7"
                  strokeWidth={1.5}
                  fillOpacity={1}
                  fill="url(#colorBalance)"
                />

                {/* Right Y Axis: Individual Streams */}
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="nationalPensionMan"
                  name="국민연금 (월)"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 1 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="privatePensionMan"
                  name="사적/종신연금 (월)"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={{ r: 1 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="assetWithdrawalMan"
                  name="금융자산 인출액 (월)"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={{ r: 1 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="monthlyTaxedMan"
                  name="총 세후 월 수령액"
                  stroke="#4f46e5"
                  strokeWidth={3}
                  dot={{ r: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPrincipal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.2} />
                  </linearGradient>
                  <linearGradient id="colorYield" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.7} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.2} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="ageLabel" tick={{ fontSize: 10, fill: "#475569", fontWeight: "bold" }} />
                <YAxis
                  tickFormatter={(v) => (v >= 10000 ? `${(v / 10000).toFixed(1)}억` : `${formatNumber(v)}만`)}
                  tick={{ fontSize: 10, fill: "#334155", fontWeight: "bold" }}
                />
                <Tooltip
                  formatter={(value: any, name: any) => [
                    value >= 10000 ? `${(value / 10000).toFixed(2)}억원` : `${formatNumber(value)}만원`,
                    name
                  ]}
                  contentStyle={{ fontSize: 11, borderRadius: 8, borderColor: "#cbd5e1" }}
                />
                <Legend wrapperStyle={{ fontSize: 11, fontWeight: "bold" }} />
                <Area
                  type="monotone"
                  dataKey="principalBalanceMan"
                  stackId="1"
                  name="불입 원금 잔액"
                  stroke="#64748b"
                  fill="url(#colorPrincipal)"
                />
                <Area
                  type="monotone"
                  dataKey="yieldBalanceMan"
                  stackId="1"
                  name="누적 복리 투자 수익금"
                  stroke="#6366f1"
                  fill="url(#colorYield)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Detailed Simulation Table (No outer card frame, zero margins, compact fonts) */}
      <div className="space-y-3 pt-2">
        <div className="flex flex-row justify-between items-center border-b border-slate-200/80 pb-2.5 gap-2">
          <div className="flex items-center gap-1.5">
            <Table className="w-5 h-5 text-indigo-600" />
            <h4 className="text-sm sm:text-base font-extrabold text-indigo-950 font-display">연도별 세부 시뮬레이션</h4>
          </div>

          {/* Toggle buttons: [간단보기] (기본) vs [상세보기] */}
          <div className="flex items-center bg-slate-200/70 p-1 rounded-xl border border-slate-300/60">
            <button
              type="button"
              onClick={() => setTableViewMode("simple")}
              className={`px-2.5 sm:px-3.5 py-1 text-xs font-black rounded-lg transition-all cursor-pointer ${
                tableViewMode === "simple"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              id="btn-table-simple-view"
            >
              간단보기 (기본)
            </button>
            <button
              type="button"
              onClick={() => setTableViewMode("detail")}
              className={`px-2.5 sm:px-3.5 py-1 text-xs font-black rounded-lg transition-all cursor-pointer ${
                tableViewMode === "detail"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              id="btn-table-detail-view"
            >
              상세보기
            </button>
          </div>
        </div>

        {tableViewMode === "simple" ? (
          /* [간단보기]: 연도(나이) | 월수급총액 | 잔여자산 (모바일 스크롤 없음) */
          <div className="w-full border border-slate-200/80 rounded-xl overflow-hidden bg-white shadow-2xs">
            <table className="w-full text-left text-[11px] sm:text-xs border-collapse table-fixed" id="table-details-simple">
              <thead>
                <tr className="bg-slate-100/90 border-b border-slate-200/80 text-slate-700 font-extrabold">
                  <th className="py-2.5 px-2 w-[32%] sm:w-[28%] text-left">연도(나이)</th>
                  <th className="py-2.5 px-2 w-[34%] sm:w-[36%] text-right text-indigo-950 font-black">월수급총액 (세후)</th>
                  <th className="py-2.5 px-2 w-[34%] sm:w-[36%] text-right text-slate-900 font-extrabold">잔여자산</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                {results.map((row) => (
                  <tr key={row.age} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2 px-2 text-slate-700 font-extrabold whitespace-nowrap">
                      {row.year}년 <span className="text-slate-500 font-medium">({row.age}세)</span>
                    </td>
                    <td className="py-2 px-2 text-right font-mono text-indigo-900 font-black whitespace-nowrap">
                      {formatNumber(row.monthlyTaxed)}원
                    </td>
                    <td className="py-2 px-2 text-right font-mono font-black text-indigo-950 whitespace-nowrap">
                      {formatKoreanCurrency(row.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* [상세보기]: 연도(나이) | 월수급총액 | 국민연금 | 사적연금 | 연수익금 | 잔여자산 (좌우 스크롤바 UI 명확) */
          <div className="w-full overflow-x-auto border border-slate-200/80 rounded-xl bg-white shadow-2xs [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar-thumb]:bg-indigo-400/80 [&::-webkit-scrollbar-track]:bg-slate-100 [&::-webkit-scrollbar-thumb]:rounded-full">
            <table className="w-full min-w-[580px] text-left text-[11px] sm:text-xs border-collapse" id="table-details-detail">
              <thead>
                <tr className="bg-slate-100/90 border-b border-slate-200/80 text-slate-700 font-extrabold">
                  <th className="py-2.5 px-2 sm:px-3 text-left">연도(나이)</th>
                  <th className="py-2.5 px-2 sm:px-3 text-right text-indigo-950 font-black">월수급총액 (세후)</th>
                  <th className="py-2.5 px-2 sm:px-3 text-right text-emerald-700">국민연금</th>
                  <th className="py-2.5 px-2 sm:px-3 text-right text-purple-700">사적연금</th>
                  <th className="py-2.5 px-2 sm:px-3 text-right text-indigo-800">연수익금</th>
                  <th className="py-2.5 px-2 sm:px-3 text-right text-slate-900 font-black">잔여자산</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                {results.map((row) => (
                  <tr key={row.age} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2 px-2 sm:px-3 text-slate-700 font-extrabold whitespace-nowrap">
                      {row.year}년 <span className="text-slate-500 font-medium">({row.age}세)</span>
                    </td>
                    <td className="py-2 px-2 sm:px-3 text-right font-mono text-indigo-900 font-black whitespace-nowrap">
                      {formatNumber(row.monthlyTaxed)}원
                    </td>
                    <td className="py-2 px-2 sm:px-3 text-right font-mono text-emerald-600 whitespace-nowrap">
                      {formatNumber(row.nationalPension)}원
                    </td>
                    <td className="py-2 px-2 sm:px-3 text-right font-mono text-purple-600 whitespace-nowrap">
                      {formatNumber(row.privatePension || 0)}원
                    </td>
                    <td className="py-2 px-2 sm:px-3 text-right font-mono text-indigo-600 whitespace-nowrap">
                      {formatNumber(row.annualYieldEarned)}원
                    </td>
                    <td className="py-2 px-2 sm:px-3 text-right font-mono font-black text-indigo-950 whitespace-nowrap">
                      {formatKoreanCurrency(row.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
