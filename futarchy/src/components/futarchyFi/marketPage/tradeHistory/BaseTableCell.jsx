import React from 'react';

export const BaseTableCell = ({ children, className = "" }) => (
  <td className={`px-4 py-3 text-xs border-b border-futarchyGray62 dark:border-futarchyDarkGray42 ${className}`}>
    {children}
  </td>
);

export default BaseTableCell; 