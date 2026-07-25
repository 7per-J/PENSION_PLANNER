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
import {
  TrendingUp,
  Download,
  Bot,
  BrainCircuit,
  Hourglass,
  Coins,
  Banknote,
  Table,
  Sparkles,
  AlertCircle
} from "lucide-react";
import ReactMarkdown from "react-markdown";

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
  const [splitView, setSplitView] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string>("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  // Manual Trigger for AI Retirement Diagnosis
  const handleFetchAiAnalysis = async () => {
    setAiLoading(true);
    setAiError("");
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          birthYear: conditions.birthYear,
          expectedLifespan: conditions.expectedLifespan,
          inflationRate: conditions.inflationRate,
          pensionIncome,
          financialAssets,
          conditions,
          simulationSummary: {
            totalAssets: summary.totalAssets,
            firstYearMonthly: summary.firstYearMonthly,
            exhaustionAge: summary.exhaustionAge,
            exhaustionYear: summary.exhaustionYear
          }
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "AI 분석 서버에서 응답을 수신하는 데 실패했습니다.");
      }

      const data = await response.json();
      setAiAnalysis(data.analysis);
    } catch (err: any) {
      console.error(err);
      setAiError(err.message || "서버 통신 중 오류가 발생했습니다. 아래 기본 예측값 및 요약 테이블을 먼저 참조해 주세요.");
    } finally {
      setAiLoading(false);
    }
  };

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

  // Default Advice Generator
  const getLocalAdvice = () => {
    const totalAssets = summary.totalAssets;
    const isExhausted = summary.exhaustionAge !== null;
    const isUnder90 = isExhausted && (summary.exhaustionAge || 0) < 90;

    let adviceText = `### 🌟 종합 자산 분석 및 제언\n`;
    adviceText += `현재 설계에 따른 **은퇴 자산 총 수명** 및 기본 가이드를 제공합니다.\n\n`;

    if (totalAssets === 0 && (!conditions.privatePensions || conditions.privatePensions.length === 0)) {
      adviceText += `- **위험 알림**: 현재 금융 자산 원금이 0원으로 설정되어 공적연금에만 전적으로 의존하는 구조입니다. 국민연금 개시 나이인 **만 ${pensionIncome.nationalStartAge + pensionIncome.nationalTiming}세** 전까지 생활비를 확보할 수 있는 가교 자산 마련이 시급합니다.\n`;
    } else if (isUnder90) {
      adviceText += `- **안정성 경고**: 기대수명보다 빠른 **만 ${summary.exhaustionAge}세**(${summary.exhaustionYear}년 말)에 금융 자산이 조기 고갈될 가능성이 높습니다. 자산 고갈 이후에는 오직 매달 지급되는 연금액에만 생활비를 전적으로 의존해야 하는 상황입니다.\n`;
    } else {
      const weightedAvgYield = (
        ((financialAssets.irp || 0) * (financialAssets.irpYield || 0) +
         (financialAssets.pensionSav || 0) * (financialAssets.pensionSavYield || 0) +
         (financialAssets.dc || 0) * (financialAssets.dcYield || 0) +
         (financialAssets.isa || 0) * (financialAssets.isaYield || 0) +
         (financialAssets.general || 0) * (financialAssets.generalYield || 0) +
         (financialAssets.cash || 0) * (financialAssets.cashYield || 0)) /
        (totalAssets || 1)
      ).toFixed(1);
      adviceText += `- **준비도 평가**: 축하합니다! 기대수명인 만 **${conditions.expectedLifespan}세**까지 은퇴 자산이 고갈되지 않고 안정적으로 유지됩니다. 복리 수익률 **${weightedAvgYield}%**의 포트폴리오를 지속적으로 유지하시는 것을 추천합니다.\n`;
    }

    adviceText += `\n### 📈 맞춤형 은퇴 대응 가이드\n`;
    if (isExhausted) {
      adviceText += `1. **국민연금 수령 연기 고려**: 국민연금 수령 시기를 연기하면 1년당 **+7.2%(최대 36%)**의 연금액이 평생 증액됩니다.\n`;
      adviceText += `2. **고금리 개인형 IRP 가입 권장**: 세액공제 혜택과 복리 과세 이연이 보장되는 **개인형 IRP(예상 수익률 5.0% 가정)**로 자금을 이전하여 자산 소진 속도를 대폭 늦추십시오.\n`;
    } else {
      adviceText += `1. **절세 인출 순서 확립**: 자산 인출 시 **세제 혜택 계좌(IRP -> ISA)** 순으로 안전 인출률을 조율하여 은퇴 소득세를 최소화하십시오.\n`;
      adviceText += `2. **물가상승률 헤지**: 매년 **${conditions.inflationRate}%** 수준의 물가 상승을 고려할 때 현금 비중보다는 배당 성향이 강한 금융 자산 비중을 늘려 실질 구매력을 방어해야 합니다.\n`;
    }

    return adviceText;
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

  // CSV Export Utility
  const handleExportCSV = () => {
    if (results.length === 0) return;

    let csvContent = "\uFEFF"; // UTF-8 BOM for Korean Excel Compatibility
    csvContent += "연도,나이,국민연금(월),사적연금(월),자산인출액(월),총월수급액(세후),연간총수령액,예상연수익금,원금잔액,수익금잔액,자산잔액총합계\n";
    results.forEach((row) => {
      csvContent += `"${row.year}년","만 ${row.age}세","${row.nationalPension}원","${row.privatePension || 0}원","${row.assetWithdrawal || 0}원","${row.monthlyTaxed}원","${row.annualTotal}원","${row.annualYieldEarned}원","${row.principalBalance}원","${row.yieldBalance}원","${row.balance}원"\n`;
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `은퇴설계_연금_시뮬레이션_결과.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6" id="result-dashboard">
      {/* Recharts Trajectory & Composition */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-3 mb-5 gap-3">
          <div className="flex gap-1.5 bg-slate-100 p-1.5 rounded-lg">
            <button
              onClick={() => setActiveTab("trajectory")}
              className={`px-4 py-2 text-xs sm:text-sm font-extrabold rounded-md transition-all cursor-pointer ${
                activeTab === "trajectory"
                  ? "bg-white text-indigo-950 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              종합 연금수급 추이 (구분 그래프)
            </button>
            <button
              onClick={() => setActiveTab("split")}
              className={`px-4 py-2 text-xs sm:text-sm font-extrabold rounded-md transition-all cursor-pointer ${
                activeTab === "split"
                  ? "bg-white text-indigo-950 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              자산 원금 / 수익금 추적
            </button>
          </div>
          <span className="text-xs text-slate-500 font-bold">
            ※ 국민연금, 사적연금, 자산인출액 및 총수령액이 라인별로 정교하게 구분 표현됩니다.
          </span>
        </div>

        <div className="h-96 w-full">
          {activeTab === "trajectory" ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284c7" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#0284c7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="ageLabel" tick={{ fontSize: 11, fill: "#475569", fontWeight: "bold" }} />
                <YAxis
                  yAxisId="left"
                  tickFormatter={(v) => (v >= 10000 ? `${(v / 10000).toFixed(1)}억` : `${formatNumber(v)}만`)}
                  tick={{ fontSize: 11, fill: "#0284c7", fontWeight: "bold" }}
                  label={{ value: "자산 잔액", angle: -90, position: "insideLeft", offset: 12, fontSize: 11, fill: "#0284c7", fontWeight: "bold" }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickFormatter={(v) => `${formatNumber(v)}만`}
                  tick={{ fontSize: 11, fill: "#4f46e5", fontWeight: "bold" }}
                  label={{ value: "월 수령액 (만원)", angle: 90, position: "insideRight", offset: 12, fontSize: 11, fill: "#4f46e5", fontWeight: "bold" }}
                />
                <Tooltip
                  formatter={(value: any, name: any) => {
                    if (name === "자산 총 잔액 (만원)") {
                      return [value >= 10000 ? `${(value / 10000).toFixed(2)}억원` : `${formatNumber(value)}만원`, name];
                    }
                    return [`${formatNumber(value)}만원`, name];
                  }}
                  contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: "#cbd5e1" }}
                />
                <Legend wrapperStyle={{ fontSize: 12, fontWeight: "bold" }} />

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
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
                <XAxis dataKey="ageLabel" tick={{ fontSize: 11, fill: "#475569", fontWeight: "bold" }} />
                <YAxis
                  tickFormatter={(v) => (v >= 10000 ? `${(v / 10000).toFixed(1)}억` : `${formatNumber(v)}만`)}
                  tick={{ fontSize: 11, fill: "#334155", fontWeight: "bold" }}
                />
                <Tooltip
                  formatter={(value: any, name: any) => [
                    value >= 10000 ? `${(value / 10000).toFixed(2)}억원` : `${formatNumber(value)}만원`,
                    name
                  ]}
                  contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: "#cbd5e1" }}
                />
                <Legend wrapperStyle={{ fontSize: 12, fontWeight: "bold" }} />
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

      {/* Detailed Simulation Table */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-3 mb-5 gap-3">
          <div className="flex items-center gap-2">
            <Table className="w-5.5 h-5.5 text-indigo-600" />
            <h4 className="text-sm sm:text-base font-extrabold text-indigo-950 font-display">연도별 세부 시뮬레이션 데이터</h4>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Toggle Switch */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <span className="text-xs sm:text-sm font-extrabold text-slate-500">원금/수익 상세 분리 보기</span>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={splitView}
                  onChange={() => setSplitView(!splitView)}
                  className="sr-only"
                  id="checkbox-split-view"
                />
                <div className={`w-10 h-6 rounded-full transition-colors ${splitView ? "bg-indigo-600" : "bg-slate-200"}`}>
                  <div
                    className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                      splitView ? "translate-x-5" : "translate-x-1"
                    }`}
                  />
                </div>
              </div>
            </label>

            {/* CSV Download Button */}
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 text-xs sm:text-sm font-extrabold text-indigo-600 hover:text-indigo-800 border border-indigo-150 hover:border-indigo-250 bg-indigo-50/20 px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer"
              id="btn-csv-download"
            >
              <Download className="w-4 h-4" /> CSV 엑셀 파일 다운로드
            </button>
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-100 rounded-xl">
          <table className="w-full text-left text-xs sm:text-sm border-collapse" id="table-details">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-600 font-extrabold">
                <th className="py-3 px-3">연도</th>
                <th className="py-3 px-3">나이</th>
                <th className="py-3 px-3 text-right text-emerald-700">국민연금(월)</th>
                <th className="py-3 px-3 text-right text-purple-700">사적연금(월)</th>
                <th className="py-3 px-3 text-right text-amber-700">자산인출(월)</th>
                <th className="py-3 px-3 text-right text-indigo-900 font-black">월 수급액(세후)</th>
                <th className="py-3 px-3 text-right">연간 총수령액</th>
                <th className="py-3 px-3 text-right text-indigo-800 bg-indigo-50/15">예상 연수익금</th>
                {splitView ? (
                  <>
                    <th className="py-3 px-3 text-right text-slate-700 font-extrabold bg-indigo-50/25">원금 잔액</th>
                    <th className="py-3 px-3 text-right text-indigo-800 font-extrabold bg-indigo-50/25">수익금 잔액</th>
                    <th className="py-3 px-3 text-right text-indigo-950 font-black bg-indigo-50/45">자산 총액</th>
                  </>
                ) : (
                  <th className="py-3 px-3 text-right">자산 총액</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
              {results.map((row) => (
                <tr key={row.age} className="hover:bg-slate-50/40 transition-colors">
                  <td className="py-2.5 px-3 text-slate-500 font-extrabold">{row.year}년</td>
                  <td className="py-2.5 px-3 text-slate-900">만 {row.age}세</td>
                  <td className="py-2.5 px-3 text-right font-mono text-emerald-600">{formatNumber(row.nationalPension)}원</td>
                  <td className="py-2.5 px-3 text-right font-mono text-purple-600">{formatNumber(row.privatePension || 0)}원</td>
                  <td className="py-2.5 px-3 text-right font-mono text-amber-600">{formatNumber(row.assetWithdrawal || 0)}원</td>
                  <td className="py-2.5 px-3 text-right font-mono text-indigo-900 font-black">{formatNumber(row.monthlyTaxed)}원</td>
                  <td className="py-2.5 px-3 text-right font-mono">{formatNumber(row.annualTotal)}원</td>
                  <td className="py-2.5 px-3 text-right font-mono text-indigo-600 bg-indigo-50/5">{formatNumber(row.annualYieldEarned)}원</td>
                  {splitView ? (
                    <>
                      <td className="py-2.5 px-3 text-right font-mono bg-indigo-50/10 text-slate-600">
                        {formatKoreanCurrency(row.principalBalance)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono bg-indigo-50/10 text-indigo-600">
                        {formatKoreanCurrency(row.yieldBalance)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-indigo-950 bg-indigo-50/20">
                        {formatKoreanCurrency(row.balance)}
                      </td>
                    </>
                  ) : (
                    <td className="py-2.5 px-3 text-right font-mono font-black text-indigo-950">
                      {formatKoreanCurrency(row.balance)}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 은퇴 자금 예측 진단 보고서 Section (Moved below table / 도표 하단) */}
      <div className="pt-4 space-y-6">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-6.5 h-6.5 text-indigo-600" />
          <h2 className="text-xl sm:text-2xl font-black text-indigo-950 font-display">은퇴 자금 예측 진단 보고서</h2>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1 */}
          <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 text-white rounded-2xl p-6 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[130px]">
            <div>
              <span className="text-xs sm:text-sm text-indigo-100 font-extrabold block">총보유 금융 자산</span>
              <h3 className="text-2xl sm:text-3xl font-black font-mono mt-1.5 leading-tight">
                {formatKoreanCurrency(summary.totalAssets)}
              </h3>
            </div>
            <span className="text-xs sm:text-sm text-indigo-100/90 font-bold mt-2">은퇴 설계 투입 원금 합산</span>
            <Coins className="w-16 h-16 text-white/5 absolute -right-2 -bottom-2" />
          </div>

          {/* Card 2 */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[130px]">
            <div>
              <span className="text-xs sm:text-sm text-slate-500 font-extrabold block">은퇴 첫해 세후 월 수급액</span>
              <h3 className="text-2xl sm:text-3xl font-black text-emerald-600 font-mono mt-1.5 leading-tight">
                {formatNumber(summary.firstYearMonthly)}원
              </h3>
            </div>
            <span className="text-xs sm:text-sm text-slate-500 font-bold mt-2">
              국민연금 개시 나이: 만 {pensionIncome.nationalStartAge + pensionIncome.nationalTiming}세 기준
            </span>
            <Banknote className="w-16 h-16 text-slate-50 absolute -right-2 -bottom-2" />
          </div>

          {/* Card 3 */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[130px]">
            <div>
              <span className="text-xs sm:text-sm text-slate-500 font-extrabold block">자산 고갈 예상 시점</span>
              {summary.exhaustionAge ? (
                <h3 className="text-2xl sm:text-3xl font-black text-rose-600 font-mono mt-1.5 leading-tight">
                  만 {summary.exhaustionAge}세 고갈
                </h3>
              ) : (
                <h3 className="text-2xl sm:text-3xl font-black text-emerald-600 font-mono mt-1.5 leading-tight">
                  고갈 우려 없음
                </h3>
              )}
            </div>
            <span className="text-xs sm:text-sm text-slate-500 font-bold mt-2">
              {summary.exhaustionAge ? (
                `${summary.exhaustionYear}년 말에 은퇴 금융 자산이 소진됩니다.`
              ) : conditions.withdrawType === "maintain" ? (
                "원금이 평생 안전하게 보존됩니다."
              ) : (
                "100세 이상 은퇴 자산이 안전하게 유지됩니다."
              )}
            </span>
            <Hourglass className="w-16 h-16 text-slate-50 absolute -right-2 -bottom-2" />
          </div>
        </div>

        {/* AI Pension Diagnostics Panel */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
            <div className="flex items-center gap-2.5 text-slate-900 font-bold text-sm sm:text-base">
              <Bot className="w-5.5 h-5.5 text-indigo-600" />
              <span className="font-display font-extrabold">CFP 은퇴 연금 종합 자문 리포트</span>
              <Sparkles className="w-4.5 h-4.5 text-indigo-500 animate-pulse" />
            </div>

            <button
              onClick={handleFetchAiAnalysis}
              disabled={aiLoading}
              className="self-start sm:self-auto bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white font-extrabold text-xs sm:text-sm px-4.5 py-2 rounded-xl shadow-xs hover:shadow-indigo-500/10 flex items-center gap-2 transition-all cursor-pointer"
              id="btn-fetch-ai-diagnosis"
            >
              <BrainCircuit className={`w-4 h-4 ${aiLoading ? "animate-spin" : ""}`} />
              {aiLoading ? "AI 정밀 리포트 분석 중..." : "실시간 AI 전문가 정밀 리포트 생성"}
            </button>
          </div>

          {aiLoading ? (
            <div className="flex flex-col items-center justify-center py-10 text-center space-y-4 bg-white border border-slate-100 rounded-xl">
              <BrainCircuit className="w-10 h-10 text-indigo-600 animate-spin" />
              <p className="text-sm font-extrabold text-slate-800 leading-relaxed">
                은퇴 설계 인공지능이 자산 수명, 물가 방어력, 포트폴리오 수익률을 정교하게 분석하는 중입니다.<br />
                <span className="text-xs text-slate-400 font-bold">잠시만 기다려 주세요 (약 3~8초 소요)</span>
              </p>
            </div>
          ) : aiError ? (
            <div className="space-y-4">
              <div className="flex items-start gap-2.5 p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-800 text-xs sm:text-sm">
                <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-extrabold text-sm">AI 할당량 초과 안내</p>
                  <p className="text-xs text-rose-700 mt-1 font-bold">Gemini API 무료 요청 한도를 일시적으로 초과했습니다. 시스템에 탑재된 아래 CFP 전문가 기본 진단 가이드를 참고해 주세요.</p>
                </div>
              </div>
              
              <div className="prose prose-slate max-w-none text-slate-700 text-sm sm:text-base leading-relaxed font-semibold space-y-3 bg-white border border-slate-100 p-5 rounded-xl">
                <ReactMarkdown>{getLocalAdvice()}</ReactMarkdown>
              </div>
            </div>
          ) : (
            <div className="prose prose-slate max-w-none text-slate-700 text-sm sm:text-base leading-relaxed font-semibold space-y-3 bg-white border border-slate-100 p-5 rounded-xl">
              <ReactMarkdown>{aiAnalysis || getLocalAdvice()}</ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
