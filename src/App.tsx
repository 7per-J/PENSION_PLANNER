import { useState, useEffect } from "react";
import { PensionIncome, FinancialAssets, SimConditions, SimYearResult, SimSummary } from "./types";
import { PensionInput } from "./components/PensionInput";
import { AssetInput } from "./components/AssetInput";
import { ConditionInput } from "./components/ConditionInput";
import { ResultReport } from "./components/ResultReport";
import { runPensionSimulation } from "./utils/simulation";
import { Award, Sparkles, RefreshCw } from "lucide-react";
import { motion } from "motion/react";

export default function App() {
  // 1. 연금 소득 상태
  const [pensionIncome, setPensionIncome] = useState<PensionIncome>({
    nationalAmount: 0, // 국민연금 월 개시금액 0원
    nationalStartAge: 65,
    nationalTiming: 0,
  });

  // 2. 금융 자산 상태
  const [financialAssets, setFinancialAssets] = useState<FinancialAssets>({
    irp: 0,
    irpYield: 5.0,
    pensionSav: 0,
    pensionSavYield: 5.0,
    dc: 0,
    dcYield: 5.0,
    isa: 0,
    isaYield: 5.0,
    general: 0,
    generalYield: 2.0,
    cash: 0,
    cashYield: 2.0,
  });

  // 3. 시뮬레이션 기본 설정 및 조건
  const [conditions, setConditions] = useState<SimConditions>({
    birthYear: 1970,
    expectedLifespan: 90,
    inflationRate: 2.0,
    withdrawType: "include", // '원금 포함' 기본값
    includeCriteria: "age",  // '종료 나이 기준' 기본값
    withdrawEndAge: 90,
    includeMonthlyAmount: 2000000,
    customMonthlyAmount: 3000000,
    optimalStartAge: 60,
    optimalEndAge: 85,
    taxRateType: "none",      // 비과세 기본값
    customTaxRate: 15.4,
    withdrawalStartAge: 56,  // 2026 - 1970 = 56 (올해 나이 디폴트)
    privatePensions: [],
  });

  // 4. 시뮬레이션 실행 버튼 클릭 여부 (Requirement 1: 최초 클릭 전까지 차트/도표 비노출)
  const [hasSimulated, setHasSimulated] = useState<boolean>(false);

  // 5. 시뮬레이션 결과 데이터 상태
  const [simResults, setSimResults] = useState<SimYearResult[]>([]);
  const [simSummary, setSimSummary] = useState<SimSummary>({
    totalAssets: 0,
    firstYearMonthly: 0,
    exhaustionAge: null,
    exhaustionYear: null,
  });

  // Real-time automatic simulation updates whenever inputs change
  useEffect(() => {
    const { results, summary } = runPensionSimulation(
      pensionIncome,
      financialAssets,
      conditions
    );
    setSimResults(results);
    setSimSummary(summary);
  }, [pensionIncome, financialAssets, conditions]);

  // Manual Trigger to re-simulate or scroll to results
  const handleRunSimulation = () => {
    setHasSimulated(true);
    const { results, summary } = runPensionSimulation(
      pensionIncome,
      financialAssets,
      conditions
    );
    setSimResults(results);
    setSimSummary(summary);

    // Smooth scroll to the results panel after state update / DOM render
    setTimeout(() => {
      const resultsElement = document.getElementById("result-dashboard");
      if (resultsElement) {
        resultsElement.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 100);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-12 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Header Banner */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40 backdrop-blur-md bg-white/95">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-5.5 h-5.5 text-indigo-600" />
            <span className="font-display font-black text-lg tracking-tight text-indigo-950">
              FutureFinance <span className="font-light text-slate-400">Labs</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100/50">
            <Sparkles className="w-4 h-4 text-indigo-600 animate-pulse" />
            <span className="text-xs font-bold text-indigo-950">스마트 연금 자문 엔진 탑재</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 mt-6 space-y-6">
        {/* ① Explanation Header Panel */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center bg-gradient-to-br from-indigo-950 to-slate-900 text-white rounded-3xl p-8 shadow-xs relative overflow-hidden"
          id="simulation-header-banner"
        >
          {/* Subtle Ambient Shapes */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-violet-500/10 rounded-full blur-2xl" />

          <span className="text-xs font-extrabold uppercase tracking-widest text-indigo-400 block mb-2.5 font-display">
            Life-stage Retirement Planner
          </span>
          <h1 className="text-3xl font-black font-display tracking-tight text-white mb-3.5">
            연금 자산 시뮬레이터
          </h1>
          <p className="text-slate-200 text-sm sm:text-base max-w-xl mx-auto leading-relaxed font-bold">
            은퇴 후 보유 자산과 연금을 입력하고 아래 버튼을 클릭하면 <br className="sm:hidden" /> 몇 세까지 자산이 유지되는지와 연간 자산 변화를 정교하게 예측합니다.
          </p>
          <p className="text-xs text-slate-400 mt-5 italic border-t border-slate-800/60 pt-3 max-w-sm mx-auto font-medium">
            ※ 예상 결과이며 투자수익률과 물가에 따라 달라질 수 있습니다.
          </p>
        </motion.div>

        {/* 1-Column Sequential Flow layout */}
        <div className="space-y-6">
          {/* ① 연금소득 입력 */}
          <PensionInput
            data={pensionIncome}
            birthYear={conditions.birthYear}
            onChange={setPensionIncome}
            privatePensions={conditions.privatePensions}
            onPrivatePensionsChange={(pensions) => setConditions({ ...conditions, privatePensions: pensions })}
          />

          {/* ② 금융자산 입력 */}
          <AssetInput
            data={financialAssets}
            onChange={setFinancialAssets}
          />

          {/* ③ 시뮬레이션 설정 및 조건 */}
          <ConditionInput data={conditions} onChange={setConditions} />

          {/* Centered Large Simulation Trigger Button without white card background */}
          <div className="flex justify-center pt-2 pb-4">
            <button
              type="button"
              onClick={handleRunSimulation}
              className="bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-black text-lg sm:text-2xl py-4.5 sm:py-5 px-10 sm:px-16 rounded-2xl shadow-xl hover:shadow-indigo-500/25 flex items-center justify-center gap-3.5 transition-all cursor-pointer"
              id="btn-trigger-simulation"
            >
              <RefreshCw className="w-6 h-6 sm:w-7 sm:h-7" />
              연도별 연금 수령 시뮬레이션 보기
            </button>
          </div>
        </div>

        {/* Requirement 1: Only render Results Report Display when button has been clicked */}
        {hasSimulated && simResults.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <ResultReport
              results={simResults}
              summary={simSummary}
              pensionIncome={pensionIncome}
              financialAssets={financialAssets}
              conditions={conditions}
            />
          </motion.div>
        )}
      </main>

      {/* Footer copyright */}
      <footer className="max-w-4xl mx-auto px-4 mt-12 text-center border-t border-slate-200/60 pt-6 text-xs text-slate-500 leading-relaxed font-bold">
        <p>© 2026 FutureFinance Labs. 본 연금 자산 시뮬레이터는 입력된 기초 매개변수에 기초한 예시 결과이며, 실제 금융 상품 성과 및 제도 변화에 따라 상이할 수 있습니다.</p>
        <p className="mt-1.5 font-mono text-[11px] text-slate-400 font-medium">Build Version 2.6.0 (Server-side Gemini Enabled)</p>
      </footer>
    </div>
  );
}
