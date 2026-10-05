import { useEffect, useState } from 'react';

type FinancialBucket = {
  currency: string;
  grossRevenue: number;
  refunds: number;
  netRevenue: number;
  expenses: number;
  profit: number;
};
type FinancialRow = { period: string; amounts: Array<{ currency: string; amount: number }> };
type Expense = {
  id: string;
  category: string;
  description: string | null;
  amount: number;
  currency: string;
  expenseDate: string;
  recurring: boolean;
};
type FinancialReportData = {
  totals: FinancialBucket[];
  daily: FinancialRow[];
  monthly: FinancialRow[];
  yearly: FinancialRow[];
  expenses: Expense[];
  note: string;
};
type Api = (path: string, options?: RequestInit) => Promise<any>;

const emptyReport: FinancialReportData = {
  totals: [],
  daily: [],
  monthly: [],
  yearly: [],
  expenses: [],
  note: '',
};

function money(amount: number, currency: string) {
  return `${currency} ${(amount / 100).toFixed(2)}`;
}

function FinancialReports({ api }: { api: Api }) {
  const [report, setReport] = useState<FinancialReportData>(emptyReport);
  const [expense, setExpense] = useState({
    category: '',
    description: '',
    amount: 0,
    currency: 'USD',
    expenseDate: new Date().toISOString().slice(0, 10),
    recurring: false,
  });
  const [message, setMessage] = useState('');

  const load = async () => setReport(await api('/api/v1/admin/financial-report'));

  useEffect(() => {
    void load().catch((error) =>
      setMessage(error instanceof Error ? error.message : 'Unable to load financial report'),
    );
  }, []);

  const addExpense = async () => {
    try {
      await api('/api/v1/admin/financial-expenses', {
        method: 'POST',
        body: JSON.stringify({ ...expense, amount: Math.round(expense.amount * 100) }),
      });
      await load();
      setExpense({
        category: '',
        description: '',
        amount: 0,
        currency: 'USD',
        expenseDate: new Date().toISOString().slice(0, 10),
        recurring: false,
      });
      setMessage('Operating expense recorded.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to record expense');
    }
  };

  const deleteExpense = async (id: string) => {
    try {
      await api('/api/v1/admin/financial-expenses/' + id, { method: 'DELETE' });
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to delete expense');
    }
  };

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Business intelligence</p>
          <h2>Financial Reports</h2>
          <p>
            Pendapatan dan laba adalah laporan bisnis, terpisah dari transaksi Billing & Payment.
            Semua mata uang dihitung terpisah agar tidak tercampur.
          </p>
        </div>
        <span className="status published">REPORTING</span>
      </div>
      {message && <div className="notice">{message}</div>}

      <div className="stats">
        {report.totals.map((t) => (
          <div key={t.currency}>
            <span>{t.currency} Net Revenue</span>
            <strong>{money(t.netRevenue, t.currency)}</strong>
            <small>Profit {money(t.profit, t.currency)}</small>
          </div>
        ))}
        {!report.totals.length && (
          <div>
            <span>Revenue</span>
            <strong>0.00</strong>
            <small>No successful sales yet</small>
          </div>
        )}
      </div>

      <div className="grid-two">
        <div className="panel soft">
          <p className="eyebrow">Daily accumulation</p>
          <h3>Daily revenue</h3>
          <div className="ad-list">
            {report.daily.slice(-14).map((row) => (
              <article className="ad-row" key={row.period}>
                <div>
                  <strong>{row.period}</strong>
                  <small>{row.amounts.map((a) => money(a.amount, a.currency)).join(' · ')}</small>
                </div>
              </article>
            ))}
            {!report.daily.length && <p className="muted">No daily sales yet.</p>}
          </div>
        </div>
        <div className="panel soft">
          <p className="eyebrow">Monthly accumulation</p>
          <h3>Monthly revenue</h3>
          <div className="ad-list">
            {report.monthly.slice(-12).map((row) => (
              <article className="ad-row" key={row.period}>
                <div>
                  <strong>{row.period}</strong>
                  <small>{row.amounts.map((a) => money(a.amount, a.currency)).join(' · ')}</small>
                </div>
              </article>
            ))}
            {!report.monthly.length && <p className="muted">No monthly sales yet.</p>}
          </div>
        </div>
      </div>

      <div className="grid-two">
        <div className="panel soft">
          <p className="eyebrow">Annual accumulation</p>
          <h3>Yearly revenue</h3>
          <div className="ad-list">
            {report.yearly.map((row) => (
              <article className="ad-row" key={row.period}>
                <div>
                  <strong>{row.period}</strong>
                  <small>{row.amounts.map((a) => money(a.amount, a.currency)).join(' · ')}</small>
                </div>
              </article>
            ))}
            {!report.yearly.length && <p className="muted">No yearly sales yet.</p>}
          </div>
        </div>
        <div className="panel soft">
          <p className="eyebrow">Sales summary</p>
          <h3>Gross → refunds → net → profit</h3>
          {report.totals.map((t) => (
            <div className="health-list" key={t.currency}>
              <div>
                <span>Gross sales · {t.currency}</span>
                <strong>{money(t.grossRevenue, t.currency)}</strong>
              </div>
              <div>
                <span>Refunds · {t.currency}</span>
                <strong>{money(t.refunds, t.currency)}</strong>
              </div>
              <div>
                <span>Net revenue · {t.currency}</span>
                <strong>{money(t.netRevenue, t.currency)}</strong>
              </div>
              <div>
                <span>Operating expenses · {t.currency}</span>
                <strong>{money(t.expenses, t.currency)}</strong>
              </div>
              <div>
                <span>Profit · {t.currency}</span>
                <strong>{money(t.profit, t.currency)}</strong>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="panel soft">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Profit & loss</p>
            <h3>Operating expenses</h3>
            <p className="muted">{report.note}</p>
          </div>
        </div>
        <div className="form-grid">
          <label>
            Category
            <input
              value={expense.category}
              onChange={(e) => setExpense({ ...expense, category: e.target.value })}
              placeholder="Hosting, payment fees, operations..."
            />
          </label>
          <label>
            Description
            <input
              value={expense.description}
              onChange={(e) => setExpense({ ...expense, description: e.target.value })}
            />
          </label>
          <label>
            Amount
            <input
              type="number"
              min="0"
              step="0.01"
              value={expense.amount}
              onChange={(e) => setExpense({ ...expense, amount: Number(e.target.value) })}
            />
          </label>
          <label>
            Currency
            <input
              value={expense.currency}
              onChange={(e) => setExpense({ ...expense, currency: e.target.value.toUpperCase() })}
            />
          </label>
          <label>
            Date
            <input
              type="date"
              value={expense.expenseDate}
              onChange={(e) => setExpense({ ...expense, expenseDate: e.target.value })}
            />
          </label>
          <label className="inline-check">
            Recurring
            <input
              type="checkbox"
              checked={expense.recurring}
              onChange={(e) => setExpense({ ...expense, recurring: e.target.checked })}
            />
          </label>
        </div>
        <div className="row-actions">
          <button className="primary" onClick={addExpense}>
            Add expense
          </button>
        </div>
        <div className="ad-list">
          {report.expenses.map((item) => (
            <article className="ad-row" key={item.id}>
              <div>
                <strong>{item.category}</strong>
                <p>{item.description ?? 'No description'}</p>
                <small>
                  {money(item.amount, item.currency)} ·{' '}
                  {new Date(item.expenseDate).toLocaleDateString()}
                  {item.recurring ? ' · recurring' : ''}
                </small>
              </div>
              <button className="danger" onClick={() => void deleteExpense(item.id)}>
                Delete
              </button>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default FinancialReports;
