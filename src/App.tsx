import { useEffect, useState } from 'react';
import { create, all } from 'mathjs';

const math = create(all);

type Operation = 'add' | 'subtract' | 'multiply' | 'transpose' | 'det' | 'inverse';

const variableNames = ['x', 'y', 'z', 'w', 'v', 'u', 't', 's'];

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

const formatMatrix = (matrix: number[][]) => {
  return matrix
    .map((row, i) => {
      const values = row.map((v) => formatNumber(v).padStart(8)).join(' ');

      const left = i === 0 ? '⎡' : i === matrix.length - 1 ? '⎣' : '⎢';
      const right = i === 0 ? '⎤' : i === matrix.length - 1 ? '⎦' : '⎥';

      return `${left} ${values} ${right}`;
    })
    .join('\n');
};

// Gauss-Jordan algorithm
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
  // Matrix calculator states
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

  // System solver states
  const [equations, setEquations] = useState(3);
  const [unknowns, setUnknowns] = useState(3);

  const [coefficients, setCoefficients] = useState(() => createGrid(3, 3));

  const [constants, setConstants] = useState<string[]>(['', '', '']);

  const [systemResult, setSystemResult] = useState<ReturnType<typeof solveSystem> | null>(null);

  const [systemError, setSystemError] = useState('');

  // Resize matrices when dimensions change
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

  // Matrix operations
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

        case 'inverse':
          if (rowsA !== colsA) {
            throw new Error('معکوس فقط برای ماتریس مربعی تعریف شده است.');
          }

          if (Math.abs(math.det(matrixA)) < 1e-10) {
            throw new Error('این ماتریس معکوس ندارد (دترمینان صفر است).');
          }

          result = math.inv(matrixA).valueOf();
          break;

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

  // Linear system
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
    { value: 'inverse', label: 'معکوس' },
  ] as const;

  const inputClass =
    'w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-center text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100';

  const selectClass = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-indigo-500';

  function renderMatrixInput(matrix: string[][], setMatrix: React.Dispatch<React.SetStateAction<string[][]>>) {
    return (
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
        <div
          className="grid gap-2"
          style={{
            gridTemplateColumns: `repeat(${matrix[0]?.length ?? 1}, minmax(55px, 1fr))`,
          }}
        >
          {matrix.map((row, i) =>
            row.map((value, j) => (
              <input
                key={`${i}-${j}`}
                type="number"
                step="any"
                value={value}
                onChange={(e) => {
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
        <input
          type="number"
          min={1}
          max={8}
          value={value}
          onChange={(e) => setValue(Math.min(8, Math.max(1, Number(e.target.value) || 1)))}
          className={inputClass}
        />
      </label>
    );
  }

  return (
    <main dir="rtl" className="min-h-screen bg-slate-100 px-4 py-10 text-slate-800">
      <div className="mx-auto max-w-4xl space-y-8">
        <header className="text-center">
          <h1 className="text-3xl font-bold text-indigo-700">وبسایت ماتریس ها</h1>
          <h2 className="text-2xl font-bold text-fuchsia-600">محمد امین شیخی</h2>
          <p className="mt-2 text-sm text-slate-500">ماشین حساب ماتریس ها و حل دستگاه معادلات جبرخطی</p>
        </header>

        {/* MATRIX CALCULATOR */}

        <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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
              <p dir="ltr" className="mt-3 text-center text-2xl font-bold">
                {formatNumber(scalarResult)}
              </p>
            </div>
          )}

          {matrixResult && (
            <div className="rounded-xl bg-indigo-50 p-4">
              <h3 className="font-semibold text-indigo-800">ماتریس نتیجه</h3>
              <pre dir="ltr" className="mt-4 overflow-x-auto text-center text-sm leading-8">
                {formatMatrix(matrixResult)}
              </pre>
            </div>
          )}
        </section>

        {/* LINEAR SYSTEM SOLVER */}

        <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-center text-sm">
                <thead>
                  <tr className="bg-slate-100">
                    {Array.from({ length: unknowns }, (_, i) => (
                      <th key={i} className="p-2">
                        {variableNames[i]}
                      </th>
                    ))}
                    <th className="p-2 text-indigo-700">مقدار</th>
                  </tr>
                </thead>

                <tbody>
                  {coefficients.map((row, i) => (
                    <tr key={i} className="border-b border-slate-100">
                      {row.map((value, j) => (
                        <td key={j} className="p-1">
                          <input
                            type="number"
                            step="any"
                            value={value}
                            placeholder="0"
                            onChange={(e) =>
                              setCoefficients((prev) => prev.map((r, ri) => r.map((v, ci) => (ri === i && ci === j ? e.target.value : v))))
                            }
                            className={inputClass}
                          />
                        </td>
                      ))}

                      <td className="p-1">
                        <input
                          type="number"
                          step="any"
                          value={constants[i]}
                          placeholder="0"
                          onChange={(e) => setConstants((prev) => prev.map((v, ri) => (ri === i ? e.target.value : v)))}
                          className={`${inputClass} border-indigo-200`}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
                <pre dir="ltr" className="overflow-x-auto text-center text-sm leading-8">
                  {formatMatrix(parseGrid(coefficients)!)}
                </pre>
              </div>

              <div>
                <h4 className="mb-2 text-sm font-semibold">بردار جواب b</h4>
                <pre dir="ltr" className="overflow-x-auto text-center text-sm leading-8">
                  {formatMatrix(constants.map((v) => [Number(v)]))}
                </pre>
              </div>

              <div>
                <h4 className="mb-2 text-sm font-semibold">ماتریس افزوده</h4>
                <pre dir="ltr" className="overflow-x-auto text-center text-sm leading-8">
                  {systemResult.augmented
                    .map((row, i) => {
                      const left = i === 0 ? '⎡' : i === systemResult.augmented.length - 1 ? '⎣' : '⎢';

                      const right = i === 0 ? '⎤' : i === systemResult.augmented.length - 1 ? '⎦' : '⎥';

                      const values = row.map((v, j) => `${j === unknowns ? '│ ' : ''}${formatNumber(v).padStart(7)}`).join(' ');

                      return `${left} ${values} ${right}`;
                    })
                    .join('\n')}
                </pre>
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
                      <p key={i} dir="ltr" className="font-semibold text-emerald-900">
                        {variableNames[i]} = {formatNumber(value)}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        <footer className="pb-4 text-center text-xs text-slate-400">Built with React, TypeScript, Tailwind CSS & Math.js</footer>
      </div>
    </main>
  );
}
