import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class GoogleFitService {
  private baseUrl = 'https://www.googleapis.com/fitness/v1/users/me';

  constructor(private http: HttpClient) {}

  getDataSources(token: string) {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
    return this.http.get(`${this.baseUrl}/dataSources`, { headers });
  }

  getStepCount(token: string, startTimeMillis: number, endTimeMillis: number) {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    const body = {
      aggregateBy: [{
        dataTypeName: "com.google.step_count.delta"
      }],
      bucketByTime: { durationMillis: 86400000 },
      startTimeMillis,
      endTimeMillis
    };

    return this.http.post(`${this.baseUrl}/dataset:aggregate`, body, { headers });
  }
}
