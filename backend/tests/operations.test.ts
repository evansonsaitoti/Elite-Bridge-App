import { describe,it,expect } from 'vitest';
import { checkGeofence,distanceMeters } from '../src/services/geofence';
import { payrollCsv } from '../src/services/payroll-export';
describe('Geofence and payroll boundaries',()=>{
  it('measures distance and rejects stale, inaccurate, missing and outside locations',()=>{
    expect(distanceMeters(0,0,0,1)).toBeCloseTo(111195,0);
    const fence={latitude:42,longitude:-71,radius_meters:150};
    const location={latitude:42,longitude:-71,accuracy:10,capturedAt:new Date().toISOString()};
    expect(checkGeofence(fence,location)?.distanceMeters).toBe(0);
    expect(()=>checkGeofence(fence,null)).toThrow();
    expect(()=>checkGeofence(fence,{...location,accuracy:200})).toThrow();
    expect(()=>checkGeofence(fence,{...location,capturedAt:new Date(Date.now()+60000).toISOString()})).toThrow();
    expect(()=>checkGeofence(fence,{...location,latitude:42.1})).toThrow();
    expect(checkGeofence(null,null)).toBeUndefined();
  });
  it('neutralizes formula injection and preserves commas and newlines in CSV',()=>{
    const csv=payrollCsv([{id:1,first_name:'=HYPERLINK("malicious")',last_name:'A, B\nC',worked_minutes:90,status:'approved'}]);
    expect(csv).toContain('\'=HYPERLINK(""malicious"")');
    expect(csv).toContain('"A, B\nC"');
    expect(csv).toContain('"1.5000"');
  });
});
