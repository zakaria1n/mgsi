import { supabase } from '../config/supabase';
import { UserVelocityStats } from '../types';

export class LearningEngine {
  /**
   * Updates statistical velocity when a Focus session completes.
   * Calculates moving average ratio = actual_minutes / planned_minutes
   */
  public static async recordSessionCompletion(
    userId: string,
    subjectId: string,
    taskType: string,
    plannedMinutes: number,
    actualMinutes: number
  ): Promise<UserVelocityStats | null> {
    if (!subjectId || plannedMinutes <= 0 || actualMinutes <= 0) return null;

    const ratio = Math.max(0.2, Math.min(3.0, actualMinutes / plannedMinutes));

    // Fetch existing stats
    const { data: existing } = await supabase
      .from('user_velocity_stats')
      .select('*')
      .eq('user_id', userId)
      .eq('subject_id', subjectId)
      .eq('task_type', taskType)
      .maybeSingle();

    if (existing) {
      const newSamples = (existing.samples_count || 1) + 1;
      // Exponential moving average (weight recent 35%)
      const alpha = 0.35;
      const updatedAvg = parseFloat(
        (existing.avg_ratio_actual_vs_planned * (1 - alpha) + ratio * alpha).toFixed(2)
      );
      const updatedMedian = Math.round(
        existing.median_duration_minutes * (1 - alpha) + actualMinutes * alpha
      );

      const { data, error } = await supabase
        .from('user_velocity_stats')
        .update({
          samples_count: newSamples,
          avg_ratio_actual_vs_planned: updatedAvg,
          median_duration_minutes: updatedMedian,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        console.error('Failed to update velocity stats:', error);
        return null;
      }
      return data;
    } else {
      const { data, error } = await supabase
        .from('user_velocity_stats')
        .insert({
          user_id: userId,
          subject_id: subjectId,
          task_type: taskType,
          samples_count: 1,
          avg_ratio_actual_vs_planned: parseFloat(ratio.toFixed(2)),
          median_duration_minutes: actualMinutes,
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to insert velocity stats:', error);
        return null;
      }
      return data;
    }
  }

  public static async getUserVelocity(userId: string): Promise<UserVelocityStats[]> {
    const { data, error } = await supabase
      .from('user_velocity_stats')
      .select('*')
      .eq('user_id', userId);

    if (error) return [];
    return data || [];
  }
}
