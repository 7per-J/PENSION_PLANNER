import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini SDK with named parameters as instructed
const getAIClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("WARNING: GEMINI_API_KEY environment variable is not set.");
    return null;
  }
  return new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
};

// API Endpoint for AI Retirement Diagnosis
app.post("/api/analyze", async (req, res) => {
  try {
    const ai = getAIClient();
    if (!ai) {
      return res.status(500).json({
        error: "Gemini API key is missing. Please set GEMINI_API_KEY in Secrets."
      });
    }

    const {
      birthYear,
      expectedLifespan,
      inflationRate,
      pensionIncome,
      financialAssets,
      conditions,
      simulationSummary
    } = req.body;

    const prompt = `
당신은 대한민국 최고의 은퇴 설계 및 자산 관리 전문가(CFP)입니다.
사용자가 입력한 국민연금 소득 및 금융자산, 그리고 시뮬레이션 결과를 기반으로 아주 전문적이고 따뜻하며 신뢰감 있는 '은퇴 자산 종합 진단 리포트'를 작성해 주세요.

[사용자 입력 정보]
- 출생년도: ${birthYear}년생 (현재 만 ${2026 - birthYear}세)
- 예상수명: ${expectedLifespan}세
- 희망 인출방식: ${conditions.withdrawType === 'include' ? '원금 소진형 (원금 포함)' : conditions.withdrawType === 'maintain' ? '수익금 인출형 (원금 유지)' : '정액 생활비 인출형'}
- 연금 개시 나이: 만 ${conditions.withdrawalStartAge || (2026 - birthYear)}세부터 인출 시작
- 물가상승률: ${inflationRate}%

[연금소득 현황]
- 국민연금 예상 월 수령액: ${pensionIncome.nationalAmount.toLocaleString()}원 (수령 시작 나이: 만 ${pensionIncome.nationalStartAge + pensionIncome.nationalTiming}세)
- 사적연금/종신연금 목록: ${conditions.privatePensions && conditions.privatePensions.length > 0 ? conditions.privatePensions.map((p: any) => `${p.name || '사적연금'}: 월 ${p.monthlyAmount.toLocaleString()}원 (만 ${p.startAge}세부터 ${p.pensionType === 'whole' ? '종신' : `만 ${p.endAge}세까지`})`).join(', ') : '없음'} (※ 사적연금은 물가상승률 미적용 고정액 및 비과세)

[금융자산 현황]
- 개인형 IRP: ${financialAssets.irp.toLocaleString()}원 (예상 수익률: ${financialAssets.irpYield}%)
- 연금저축계좌: ${(financialAssets.pensionSav || 0).toLocaleString()}원 (예상 수익률: ${financialAssets.pensionSavYield || 0}%)
- DC형 퇴직연금 잔액: ${financialAssets.dc.toLocaleString()}원 (예상 수익률: ${financialAssets.dcYield}%)
- ISA 잔액: ${financialAssets.isa.toLocaleString()}원 (예상 수익률: ${financialAssets.isaYield}%)
- 일반 주식/예적금 잔액: ${financialAssets.general.toLocaleString()}원 (예상 수익률: ${financialAssets.generalYield}%)
- 현금/CMA 잔액: ${financialAssets.cash.toLocaleString()}원 (예상 수익률: ${financialAssets.cashYield}%)

[시뮬레이션 결과 요약]
- 총 보유자산 합계: ${simulationSummary.totalAssets.toLocaleString()}원
- 은퇴 첫해 세후 월 수급액: ${simulationSummary.firstYearMonthly.toLocaleString()}원
- 자산 고갈 예상: ${simulationSummary.exhaustionAge ? `만 ${simulationSummary.exhaustionAge}세 고갈 예정 (${simulationSummary.exhaustionYear}년 말)` : '100세 이상 유지 또는 고갈 없음'}

[요청 사항]
다음 구조로 명확하고 설득력 있는 리포트를 작성해 주세요 (Markdown 형식 사용):
1. 🌟 **종합 총평**: 현재 준비 상태에 대한 전문가적 평가 (매우 긍정적인 부분과 주의해야 할 부분을 짚어주세요)
2. 📈 **자산 포트폴리오 및 연수익률 제언**: 현재 입력된 자산들의 연수익률 배분이 적절한지, 기대수익률을 높이거나 안정성을 강화하기 위해 포트폴리오를 어떻게 조정해야 하는지 조언
3. 🛡️ **은퇴 생활비 확보전략**: 고갈 시점 극복을 위해(고갈 우려 시) 인출 순서 조정이나 개인형 IRP 추가 적립, 국민연금 연기/조기 활용법 등 구체적 행동 지침 제시 (고갈 우려가 없다면 자산 증대 및 절세 인출 팁 제시)
4. 💡 **한 줄의 핵심 조언**: 은퇴 준비를 위한 가장 강력하고 실천 가능한 핵심 행동 하나 제안.

답변은 반드시 한국어로 매우 정중하고 신뢰감 있는 어조로 제공해 주세요. 불필요한 서론이나 아웃트로 없이 본문 리포트만 Markdown으로 작성해 주세요.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    res.json({ analysis: response.text });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    res.status(500).json({ error: error.message || "AI 분석 생성 중 오류가 발생했습니다." });
  }
});

// Vite Middleware for Dev, Static file serving for Prod
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
