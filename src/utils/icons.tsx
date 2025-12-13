import * as LucideIcons from 'lucide-react';
import type { LucideProps } from 'lucide-react';

type IconName = keyof typeof LucideIcons;

interface DynamicIconProps extends LucideProps {
  name: string;
}

// lucide-react 아이콘을 동적으로 렌더링
export function DynamicIcon({ name, ...props }: DynamicIconProps) {
  const IconComponent = LucideIcons[name as IconName] as React.ComponentType<LucideProps>;

  if (!IconComponent) {
    // 아이콘을 찾을 수 없으면 기본 아이콘 반환
    return <LucideIcons.Circle {...props} />;
  }

  return <IconComponent {...props} />;
}

// 아이콘 이름이 유효한지 확인
// eslint-disable-next-line react-refresh/only-export-components
export function isValidIconName(name: string): boolean {
  return name in LucideIcons;
}
