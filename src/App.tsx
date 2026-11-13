import { useEffect, useState } from 'react';
import { create, all } from 'mathjs';

const math = create(all);

type Operation = 'add' | 'subtract' | 'multiply' | 'transpose' | 'det';

const variableNames = ['x', 'y', 'z', 'w', 'v', 'u', 't', 's'];

const isValidNumericInput = (val: string) => /^-?\d*\.?\d*$/.test(val);

const createGrid = (rows: number, cols: number): string[][] => Array.from({ length: rows }, () => Array(cols).fill(''));

const resizeGrid = (grid: string[][], rows: number, cols: number) =>
  Array.from({ length: rows }, (_, i) => Array.from({ length: cols }, (_, j) => grid[i]?.[j] ?? ''));

const parseGrid = (grid: string[][]): number[][] | null => {
  const result = grid.map((row) => row.map(Number));

  if (grid.some((row) => row.some((value) => value.trim() === '')) || result.some((row) => row.some((value) => !Number.isFinite(value)))) {
    return null;
  }

  return result;
};

const formatNumber = (value: number) => Number(value.toFixed(6)).toString();

function solveSystem(A: number[][], b: number[]) {
  const rows = A.length;
  const cols = A[0].length;

  const augmented = A.map((row, i) => [...row, b[i]]);

  let pivotRow = 0;
  const pivots: number[] = [];
  const EPSILON = 1e-10;

  for (let col = 0; col < cols && pivotRow < rows; col++) {
    let maxRow = pivotRow;

    for (let r = pivotRow + 1; r < rows; r++) {
      if (Math.abs(augmented[r][col]) > Math.abs(augmented[maxRow][col])) {
        maxRow = r;
      }
    }

    if (Math.abs(augmented[maxRow][col]) < EPSILON) continue;

    [augmented[pivotRow], augmented[maxRow]] = [augmented[maxRow], augmented[pivotRow]];

    const pivot = augmented[pivotRow][col];

    for (let j = 0; j <= cols; j++) {
      augmented[pivotRow][j] /= pivot;
    }

    for (let r = 0; r < rows; r++) {
      if (r === pivotRow) continue;

      const factor = augmented[r][col];

      for (let j = 0; j <= cols; j++) {
        augmented[r][j] -= factor * augmented[pivotRow][j];
      }
    }

    pivots.push(col);
    pivotRow++;
  }

  const rankA = pivots.length;

  const inconsistent = augmented.some((row) => {
    const allZero = row.slice(0, cols).every((value) => Math.abs(value) < EPSILON);

    return allZero && Math.abs(row[cols]) >= EPSILON;
  });

  if (inconsistent) {
    return {
      type: 'none' as const,
      augmented,
    };
  }

  if (rankA < cols) {
    return {
      type: 'infinite' as const,
      augmented,
    };
  }

  const solution = Array(cols).fill(0);

  pivots.forEach((col, row) => {
    solution[col] = augmented[row][cols];
  });

  return {
    type: 'unique' as const,
    solution,
    augmented,
  };
}

export default function App() {
  const [operation, setOperation] = useState<Operation>('add');

  const [rowsA, setRowsA] = useState(2);
  const [colsA, setColsA] = useState(2);
  const [rowsB, setRowsB] = useState(2);
  const [colsB, setColsB] = useState(2);

  const [A, setA] = useState(() => createGrid(2, 2));
  const [B, setB] = useState(() => createGrid(2, 2));

  const [matrixResult, setMatrixResult] = useState<number[][] | null>(null);
  const [scalarResult, setScalarResult] = useState<number | null>(null);
  const [matrixError, setMatrixError] = useState('');

  const [equations, setEquations] = useState(3);
  const [unknowns, setUnknowns] = useState(3);

  const [coefficients, setCoefficients] = useState(() => createGrid(3, 3));

  const [constants, setConstants] = useState<string[]>(['', '', '']);

  const [systemResult, setSystemResult] = useState<ReturnType<typeof solveSystem> | null>(null);

  const [systemError, setSystemError] = useState('');

  useEffect(() => {
    setA((prev) => resizeGrid(prev, rowsA, colsA));
  }, [rowsA, colsA]);

  useEffect(() => {
    setB((prev) => resizeGrid(prev, rowsB, colsB));
  }, [rowsB, colsB]);

  useEffect(() => {
    setCoefficients((prev) => resizeGrid(prev, equations, unknowns));

    setConstants((prev) => Array.from({ length: equations }, (_, i) => prev[i] ?? ''));
  }, [equations, unknowns]);

  const needsB = ['add', 'subtract', 'multiply'].includes(operation);

  function calculateMatrix() {
    setMatrixError('');
    setMatrixResult(null);
    setScalarResult(null);

    const matrixA = parseGrid(A);

    if (!matrixA) {
      setMatrixError('لطفاً تمام خانه‌های ماتریس A را پر کنید.');
      return;
    }

    const matrixB = needsB ? parseGrid(B) : null;

    if (needsB && !matrixB) {
      setMatrixError('لطفاً تمام خانه‌های ماتریس B را پر کنید.');
      return;
    }

    try {
      let result: any;

      switch (operation) {
        case 'det':
          if (rowsA !== colsA) {
            throw new Error('دترمینان فقط برای ماتریس مربعی تعریف شده است.');
          }

          setScalarResult(math.det(matrixA));
          return;

        case 'transpose':
          result = math.transpose(matrixA).valueOf();
          break;

        case 'add':
          if (rowsA !== rowsB || colsA !== colsB) {
            throw new Error('برای جمع، ابعاد دو ماتریس باید یکسان باشند.');
          }

          result = math.add(matrixA, matrixB!).valueOf();
          break;

        case 'subtract':
          if (rowsA !== rowsB || colsA !== colsB) {
            throw new Error('برای تفریق، ابعاد دو ماتریس باید یکسان باشند.');
          }

          result = math.subtract(matrixA, matrixB!).valueOf();
          break;

        case 'multiply':
          if (colsA !== rowsB) {
            throw new Error('تعداد ستون‌های A باید برابر تعداد سطرهای B باشد.');
          }

          result = math.multiply(matrixA, matrixB!).valueOf();
          break;
      }

      setMatrixResult((result as number[][]).map((row) => row.map((value) => Number(value))));
    } catch (error) {
      setMatrixError(error instanceof Error ? error.message : 'خطای محاسباتی');
    }
  }

  function calculateSystem() {
    setSystemError('');
    setSystemResult(null);

    const matrix = parseGrid(coefficients);
    const vector = constants.map(Number);

    if (!matrix || constants.some((v) => v.trim() === '') || vector.some((v) => !Number.isFinite(v))) {
      setSystemError('لطفاً تمام ضرایب و مقادیر سمت راست را وارد کنید.');
      return;
    }

    try {
      const result = solveSystem(matrix, vector);
      setSystemResult(result);
    } catch {
      setSystemError('در حل دستگاه خطایی رخ داد.');
    }
  }

  const operations = [
    { value: 'add', label: 'جمع (+)' },
    { value: 'subtract', label: 'تفریق (-)' },
    { value: 'multiply', label: 'ضرب (×)' },
    { value: 'det', label: 'دترمینان' },
    { value: 'transpose', label: 'ترانهاده' },
  ] as const;

  const inputClass =
    'w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-center text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100';

  const selectClass = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-indigo-500';

  function renderMatrixInput(matrix: string[][], setMatrix: React.Dispatch<React.SetStateAction<string[][]>>) {
    return (
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-3" dir="ltr">
        <div
          className="grid gap-1.5"
          style={{
            gridTemplateColumns: `repeat(${matrix[0]?.length ?? 1}, minmax(48px, 1fr))`,
          }}
        >
          {matrix.map((row, i) =>
            row.map((value, j) => (
              <input
                key={`${i}-${j}`}
                type="text"
                inputMode="decimal"
                value={value}
                onChange={(e) => {
                  if (!isValidNumericInput(e.target.value)) return;
                  setMatrix((prev) => prev.map((r, ri) => r.map((v, ci) => (ri === i && ci === j ? e.target.value : v))));
                }}
                placeholder="0"
                className={inputClass}
              />
            ))
          )}
        </div>
      </div>
    );
  }

  function dimensionInput(label: string, value: number, setValue: (value: number) => void) {
    return (
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-slate-500">{label}</span>
        <div className="flex items-center gap-1" dir="ltr">
          <button
            type="button"
            onClick={() => setValue(Math.max(1, value - 1))}
            className="w-8 h-9 rounded-lg border border-slate-300 bg-white text-slate-600 font-bold text-lg flex items-center justify-center hover:bg-slate-100 active:bg-slate-200 select-none"
          >
            −
          </button>
          <span className="flex-1 h-9 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center text-sm font-semibold tabular-nums">
            {value}
          </span>
          <button
            type="button"
            onClick={() => setValue(Math.min(8, value + 1))}
            className="w-8 h-9 rounded-lg border border-slate-300 bg-white text-slate-600 font-bold text-lg flex items-center justify-center hover:bg-slate-100 active:bg-slate-200 select-none"
          >
            +
          </button>
        </div>
      </label>
    );
  }

  function renderMatrixDisplay(matrix: number[][], augmentedSplitAt?: number) {
    return (
      <div dir="ltr" className="overflow-x-auto">
        <table className="mx-auto border-collapse font-mono text-sm">
          <tbody>
            {matrix.map((row, i) => {
              const isFirst = i === 0;
              const isLast = i === matrix.length - 1;
              const bracketLeft = isFirst ? '⎡' : isLast ? '⎣' : '⎢';
              const bracketRight = isFirst ? '⎤' : isLast ? '⎦' : '⎥';
              return (
                <tr key={i}>
                  <td className="select-none px-1 text-slate-400 text-lg leading-8">{bracketLeft}</td>
                  {row.map((v, j) => (
                    <>
                      {augmentedSplitAt !== undefined && j === augmentedSplitAt && (
                        <td key={`sep-${j}`} className="select-none px-1 text-slate-400 font-bold">
                          │
                        </td>
                      )}
                      <td
                        key={j}
                        className={`px-2 py-1 text-right leading-8 tabular-nums ${v < 0 ? 'text-rose-600' : ''}`}
                        style={{ minWidth: '3.5rem' }}
                      >
                        {formatNumber(v)}
                      </td>
                    </>
                  ))}
                  <td className="select-none px-1 text-slate-400 text-lg leading-8">{bracketRight}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <main dir="rtl" className="min-h-screen bg-slate-100 px-3 sm:px-4 py-6 sm:py-10 text-slate-800">
      <div className="mx-auto max-w-4xl space-y-8">
        <header className="text-center">
          <h1 className="text-3xl font-bold text-indigo-700">وبسایت ماتریس ها</h1>
          <h2 className="text-2xl font-bold text-fuchsia-600">محمد امین شیخی</h2>
          <p className="mt-2 text-sm text-slate-500">ماشین حساب ماتریس ها و حل دستگاه معادلات جبرخطی</p>
        </header>

        {/* MATRIX CALCULATOR */}

        <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
          <div>
            <h2 className="text-xl font-bold">۱. عملیات ماتریسی</h2>
            <p className="mt-1 text-sm text-slate-500">عملیات موردنظر خود را انتخاب کنید.</p>
          </div>

          <label className="block space-y-2">
            <span className="text-sm font-medium">نوع عملیات</span>
            <select
              value={operation}
              onChange={(e) => {
                setOperation(e.target.value as Operation);
                setMatrixResult(null);
                setScalarResult(null);
                setMatrixError('');
              }}
              className={selectClass}
            >
              {operations.map((op) => (
                <option key={op.value} value={op.value}>
                  {op.label}
                </option>
              ))}
            </select>
          </label>

          <div className={`grid gap-5 ${needsB ? 'md:grid-cols-2' : 'grid-cols-1'}`}>
            {/* Matrix A */}

            <div className="space-y-3">
              <h3 className="font-semibold">ماتریس A</h3>

              <div className="grid grid-cols-2 gap-3">
                {dimensionInput('تعداد سطر', rowsA, setRowsA)}
                {dimensionInput('تعداد ستون', colsA, setColsA)}
              </div>

              {renderMatrixInput(A, setA)}
            </div>

            {/* Matrix B */}

            {needsB && (
              <div className="space-y-3">
                <h3 className="font-semibold">ماتریس B</h3>

                <div className="grid grid-cols-2 gap-3">
                  {dimensionInput('تعداد سطر', rowsB, setRowsB)}
                  {dimensionInput('تعداد ستون', colsB, setColsB)}
                </div>

                {renderMatrixInput(B, setB)}
              </div>
            )}
          </div>

          <button onClick={calculateMatrix} className="w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white transition hover:bg-indigo-700">
            محاسبه
          </button>

          {matrixError && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{matrixError}</p>}

          {scalarResult !== null && (
            <div className="rounded-xl bg-indigo-50 p-4">
              <h3 className="font-semibold text-indigo-800">نتیجه دترمینان</h3>
              <p dir="ltr" className="mt-3 text-center text-2xl font-bold tabular-nums">
                {formatNumber(scalarResult)}
              </p>
            </div>
          )}

          {matrixResult && (
            <div className="rounded-xl bg-indigo-50 p-4">
              <h3 className="mb-3 font-semibold text-indigo-800">ماتریس نتیجه</h3>
              {renderMatrixDisplay(matrixResult)}
            </div>
          )}
        </section>

        {/* LINEAR SYSTEM SOLVER */}

        <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
          <div>
            <h2 className="text-xl font-bold">۲. حل دستگاه معادلات</h2>
            <p className="mt-1 text-sm text-slate-500">ضرایب مجهول‌ها و مقادیر سمت راست معادلات را وارد کنید.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {dimensionInput('تعداد معادلات', equations, setEquations)}
            {dimensionInput('تعداد مجهول‌ها', unknowns, setUnknowns)}
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold">ضرایب معادلات</h3>

            <div className="space-y-2">
              {coefficients.map((row, i) => (
                <div
                  key={i}
                  dir="ltr"
                  className="flex items-center gap-x-1 gap-y-2 flex-wrap rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"
                >
                  {row.map((value, j) => (
                    <div key={j} className="flex items-center gap-1">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={value}
                        placeholder="0"
                        onChange={(e) => {
                          if (!isValidNumericInput(e.target.value)) return;
                          setCoefficients((prev) => prev.map((r, ri) => r.map((v, ci) => (ri === i && ci === j ? e.target.value : v))));
                        }}
                        className="w-12 sm:w-16 rounded-lg border border-slate-300 bg-white px-1 py-1.5 text-center text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                      />
                      <span className="text-sm font-semibold text-indigo-600 select-none">{variableNames[j]}</span>
                      {j < row.length - 1 && <span className="text-slate-400 select-none px-0.5">+</span>}
                    </div>
                  ))}
                  <span className="text-slate-500 font-semibold select-none px-1">=</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={constants[i]}
                    placeholder="0"
                    onChange={(e) => {
                      if (!isValidNumericInput(e.target.value)) return;
                      setConstants((prev) => prev.map((v, ri) => (ri === i ? e.target.value : v)));
                    }}
                    className="w-12 sm:w-16 rounded-lg border border-indigo-300 bg-white px-1 py-1.5 text-center text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              ))}
            </div>
          </div>

          <button onClick={calculateSystem} className="w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white transition hover:bg-indigo-700">
            حل دستگاه
          </button>

          {systemError && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{systemError}</p>}

          {systemResult && (
            <div className="space-y-5 rounded-xl bg-slate-50 p-4">
              <h3 className="font-bold text-lg">نتیجه حل دستگاه</h3>

              <div>
                <h4 className="mb-2 text-sm font-semibold">ماتریس ضرایب A</h4>
                {renderMatrixDisplay(parseGrid(coefficients)!)}
              </div>

              <div>
                <h4 className="mb-2 text-sm font-semibold">بردار جواب b</h4>
                {renderMatrixDisplay(constants.map((v) => [Number(v)]))}
              </div>

              <div>
                <h4 className="mb-2 text-sm font-semibold">ماتریس افزوده</h4>
                {renderMatrixDisplay(systemResult.augmented, unknowns)}
              </div>

              {systemResult.type === 'none' && <div className="rounded-lg bg-red-100 p-4 text-red-700">این دستگاه جواب ندارد.</div>}

              {systemResult.type === 'infinite' && (
                <div className="rounded-lg bg-amber-100 p-4 text-amber-800">
                  این دستگاه بی‌نهایت جواب دارد.
                  <p className="mt-1 text-sm">تعداد مجهول‌ها بیشتر از رتبه ماتریس ضرایب است.</p>
                </div>
              )}

              {systemResult.type === 'unique' && (
                <div className="rounded-lg bg-emerald-100 p-4">
                  <h4 className="font-bold text-emerald-800">جواب یکتای دستگاه</h4>

                  <div className="mt-3 space-y-2">
                    {systemResult.solution.map((value, i) => (
                      <p key={i} dir="ltr" className="font-semibold text-emerald-900 tabular-nums">
                        {variableNames[i]} = {formatNumber(value)}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        <div className="flex justify-center mt-8">
          <a
            className="inline-flex items-center justify-center rounded-xl bg-violet-600 px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-violet-500/20 transition-all duration-300 hover:-translate-y-1 hover:bg-violet-700 hover:shadow-xl hover:shadow-violet-500/30 active:translate-y-0"
            href="https://github.com/amin-sheikhy-dev/matrix-lab/blob/main/src/App.tsx"
            target="_blank"
            rel="noopener noreferrer"
          >
            نمایش کدهای این پروژه
          </a>
        </div>

        <footer className="pb-4 text-center text-xs text-slate-400">Built with React, TypeScript, Tailwind CSS & Math.js</footer>
      </div>
    </main>
  );
}
