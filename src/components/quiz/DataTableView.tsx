import type { DataTable } from '../../domain/types';
import styles from './quiz.module.css';

/** Some questions ship a data table (e.g. values per discovery source); the old app never showed it. */
export function DataTableView({ table }: { table: DataTable }) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            {table.headers.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
