// server.js
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Gemini API設定
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

// ミドルウェア
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Gemini APIを呼び出す共通関数
async function callGeminiAPI(prompt) {
    try {
        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }]
            })
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }

        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error('Gemini API Error:', error);
        throw error;
    }
}

// クイズ生成API
app.post('/api/generate-quiz', async (req, res) => {
    try {
        const { keyword } = req.body;
        
        if (!keyword) {
            return res.status(400).json({ error: 'キーワードが必要です' });
        }

        const prompt = `
${keyword}に関する3択式の問題を10問生成してください。
問題は初級、中級、上級のレベルを判定できるよう、段階的に難易度を上げてください。

以下のJSON形式で回答してください：
{
  "questions": [
    {
      "question": "問題文",
      "options": ["選択肢1", "選択肢2", "選択肢3"],
      "correct": 0,
      "level": "beginner"
    }
  ]
}

レベルは "beginner", "intermediate", "advanced" のいずれかを使用してください。
問題1-3は "beginner"、問題4-7は "intermediate"、問題8-10は "advanced" レベルにしてください。
`;

        const response = await callGeminiAPI(prompt);
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        
        if (!jsonMatch) {
            throw new Error('問題の形式が不正です');
        }
        
        const data = JSON.parse(jsonMatch[0]);
        res.json(data);
    } catch (error) {
        console.error('Quiz generation error:', error);
        res.status(500).json({ error: '問題の生成に失敗しました' });
    }
});

// 学習コンテンツ生成API
app.post('/api/generate-content', async (req, res) => {
    try {
        const { keyword, level } = req.body;
        
        if (!keyword || !level) {
            return res.status(400).json({ error: 'キーワードとレベルが必要です' });
        }

        const levelText = {
            'beginner': '初級',
            'intermediate': '中級',
            'advanced': '上級'
        };

        const prompt = `
${keyword}について、${levelText[level]}レベルの学習者向けに、パーソナライズされた学習コンテンツを生成してください。

以下の要件を満たしてください：
- 約10ページ分のボリューム（8000-10000文字程度）
- ${levelText[level]}レベルに適した内容と説明の詳しさ
- 段階的に学習できる構成
- 具体例を豊富に含む
- 実践的な内容

以下の構成で作成してください：
1. はじめに - ${keyword}の概要と重要性
2. 基礎知識 - ${levelText[level]}レベルに必要な前提知識
3. 重要な概念1 - 核となる概念の詳細解説
4. 重要な概念2 - 実践的な応用方法
5. 重要な概念3 - より高度な内容（${levelText[level]}レベル適用）
6. 実践的な応用 - 具体的な事例やプロジェクト例
7. よくある間違いと対策
8. さらなる学習のために - 次のステップと推奨リソース
9. まとめ

各セクションは${levelText[level]}レベルの学習者が理解しやすいよう、適切な詳しさで記述してください。
コードや図表が必要な場合は、テキストで表現してください。
`;

        const content = await callGeminiAPI(prompt);
        res.json({ content });
    } catch (error) {
        console.error('Content generation error:', error);
        res.status(500).json({ error: '学習コンテンツの生成に失敗しました' });
    }
});

// メインページ
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});