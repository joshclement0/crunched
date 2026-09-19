import * as React from "react";
import { Button, MessageBar, Spinner } from "@fluentui/react-components";
import { Add20Regular, Dismiss16Regular } from "@fluentui/react-icons";
import { SelectedRangeContext } from "../../chat/types";
import { useChatStyles } from "./styles";

interface SelectedRangesPanelProps {
  ranges: SelectedRangeContext[];
  isCapturing: boolean;
  disabled: boolean;
  error: string | null;
  onAdd: () => void;
  onRemove: (id: string) => void;
}

function displayCell(value: SelectedRangeContext["values"][number][number]) {
  if (value === null) return "null";
  if (value === "") return '""';
  return String(value);
}

export default function SelectedRangesPanel({
  ranges,
  isCapturing,
  disabled,
  error,
  onAdd,
  onRemove,
}: SelectedRangesPanelProps) {
  const styles = useChatStyles();
  const cellCount = ranges.reduce(
    (total, range) => total + range.rowCount * range.columnCount,
    0
  );

  return (
    <div className={styles.rangePanel} aria-label="Workbook data to send">
      <div className={styles.rangePanelHeader}>
        <div>
          <p className={styles.rangePanelTitle}>Workbook data</p>
          <p className={styles.rangePanelSummary}>
            {ranges.length
              ? `${ranges.length} ${ranges.length === 1 ? "range" : "ranges"} · ${cellCount.toLocaleString()} cells`
              : "No ranges attached"}
          </p>
        </div>
        <Button
          size="small"
          icon={isCapturing ? <Spinner size="tiny" /> : <Add20Regular />}
          disabled={disabled || isCapturing}
          onClick={onAdd}
        >
          Add selection
        </Button>
      </div>
      {error && <MessageBar intent="error">{error}</MessageBar>}
      {ranges.length > 0 && (
        <div className={styles.rangeList}>
          {ranges.map((range) => (
            <div className={styles.rangeCard} key={range.id}>
              <div className={styles.rangeCardHeader}>
                <details className={styles.rangeDetails}>
                  <summary className={styles.rangeSummary}>
                    <span className={styles.rangeAddress}>
                      {range.worksheet}!{range.address}
                    </span>
                    <span className={styles.rangeDimensions}>
                      {range.rowCount}×{range.columnCount}
                    </span>
                  </summary>
                  <div className={styles.rangeTableViewport}>
                    <table className={styles.rangeTable}>
                      <tbody>
                        {range.values.map((row, rowIndex) => (
                          <tr key={`${range.id}-row-${rowIndex}`}>
                            {row.map((value, columnIndex) => (
                              <td key={`${range.id}-${rowIndex}-${columnIndex}`}>
                                {displayCell(value)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
                <Button
                  appearance="subtle"
                  size="small"
                  icon={<Dismiss16Regular />}
                  aria-label={`Remove ${range.worksheet}!${range.address}`}
                  disabled={disabled}
                  onClick={() => onRemove(range.id)}
                />
              </div>
            </div>
          ))}
        </div>
      )}
      <p className={styles.rangeHint}>
        Captured values shown here will be sent with your next message. Change sheets or selections to add more.
      </p>
    </div>
  );
}
