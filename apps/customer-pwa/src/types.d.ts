declare module 'next/navigation' {
  export function useRouter(): any;
  export function usePathname(): string;
  export function useSearchParams(): any;
  export function useParams(): any;
  export function redirect(url: string): never;
}

declare module 'next/dynamic' {
  export default function dynamic(dynamicOptions: any, options?: any): any;
}
