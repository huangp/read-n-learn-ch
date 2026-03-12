import * as Application from 'expo-application';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

export interface DeviceInfo {
  deviceId: string;
  bundleId: string;
  appVersion: string;
}

export class DeviceInfoService {
  static async getDeviceInfo(): Promise<DeviceInfo> {
    const bundleId = Application.applicationId ?? 'unknown';
    const appVersion = Application.nativeApplicationVersion ?? '1.0.0';
    
    let deviceId: string;
    
    if (Platform.OS === 'ios') {
      // Use iOS ID for Vendor (unique per app vendor)
      deviceId = await Application.getIosIdForVendorAsync() ?? Device.modelId ?? 'unknown';
    } else {
      // Android
      deviceId = Application.getAndroidId() ?? Device.modelId ?? 'unknown';
    }
    
    return {
      deviceId,
      bundleId,
      appVersion,
    };
  }
}
