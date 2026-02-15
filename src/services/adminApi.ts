import apiClient from './api';
import { User } from '../types/user';

export interface UpdateUserRoleRequest {
  roleLevel: number;
}

export interface UpdateUserRoleResponse {
  success: boolean;
  message: string;
  user: {
    id: number;
    email: string;
    name: string;
    roleLevel: number;
  };
}

export interface UserListItem {
  id: number;
  email: string;
  name: string;
  roleLevel: number;
  role: string;
  profileImage?: string;
  createdAt?: string;
}

export const adminApi = {
  /**
   * 사용자 역할 레벨 변경 (사용자 ID로)
   */
  updateUserRoleLevel: async (
    userId: number,
    roleLevel: number
  ): Promise<UpdateUserRoleResponse> => {
    const response = await apiClient.put<UpdateUserRoleResponse>(
      `/admin/users/${userId}/role`,
      { roleLevel }
    );
    return response.data;
  },

  /**
   * 사용자 역할 레벨 변경 (이메일로)
   */
  updateUserRoleLevelByEmail: async (
    email: string,
    roleLevel: number
  ): Promise<UpdateUserRoleResponse> => {
    const response = await apiClient.put<UpdateUserRoleResponse>(
      `/admin/users/email/${email}/role`,
      { roleLevel }
    );
    return response.data;
  },

  /**
   * 사용자 목록 조회 (임시로 빈 배열 반환, 백엔드 API 추가 필요)
   */
  getAllUsers: async (): Promise<UserListItem[]> => {
    // TODO: 백엔드에 사용자 목록 조회 API 추가 필요
    // 현재는 빈 배열 반환
    try {
      // 임시로 모든 사용자 조회 시도 (실패하면 빈 배열 반환)
      return [];
    } catch (error) {
      console.warn('사용자 목록 조회 API가 아직 구현되지 않았습니다.');
      return [];
    }
  },
};

