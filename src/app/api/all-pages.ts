import { HttpClient } from '@angular/common/http';
import { EMPTY, expand, reduce } from 'rxjs';
interface Page<T> {
  data: T[];
  pagination?: {
    page: number;
    totalPages: number;
  };
}
export function allPages<T>(http: HttpClient, url: string) {
  const pageUrl = (page: number) =>
    `${url}${url.includes('?') ? '&' : '?'}page=${page}`;
  return http.get<Page<T>>(url).pipe(
    expand((response) =>
      response.pagination &&
      response.pagination.page < response.pagination.totalPages
        ? http.get<Page<T>>(pageUrl(response.pagination.page + 1))
        : EMPTY,
    ),
    reduce(
      (
        result: {
          data: T[];
        },
        page,
      ) => ({ data: result.data.concat(page.data) }),
      { data: [] },
    ),
  );
}
