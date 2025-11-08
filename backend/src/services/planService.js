const { Plan, PlanFeature, Tenant } = require("@models");
const { sequelize } = require("@config/database"); // Add this import
const { Op } = require("sequelize");

class PlanService {
  /**
   * Get all plans with features and subscriber count
   */
  async getAllPlans({ includeFeatures = true, includeSubscribers = false } = {}) {
    try {
      const include = [];
      
      if (includeFeatures) {
        include.push({
          model: PlanFeature,
          as: 'features',
          attributes: ['id', 'feature_text', 'is_included', 'display_order'],
          order: [['display_order', 'ASC']],
        });
      }

      if (includeSubscribers) {
        include.push({
          model: Tenant,
          as: 'subscribers',
          attributes: ['tenant_id', 'tenant_name', 'contact_email', 'subscription_status', 'created_at'],
          where: { is_active: true },
          required: false,
        });
      }

      const plans = await Plan.findAll({
        include,
        order: [
          ['is_popular', 'DESC'],
          ['price', 'ASC'],
        ],
      });

      return plans;
    } catch (error) {
      console.error("Error fetching plans:", error);
      throw new Error("Failed to fetch plans");
    }
  }

  /**
   * Get plan by ID with features
   */
  async getPlanById(planId, includeSubscribers = false) {
    try {
      const include = [
        {
          model: PlanFeature,
          as: 'features',
          attributes: ['id', 'feature_text', 'is_included', 'display_order'],
          order: [['display_order', 'ASC']],
        },
      ];

      if (includeSubscribers) {
        include.push({
          model: Tenant,
          as: 'subscribers',
          attributes: ['tenant_id', 'tenant_name', 'contact_email', 'subscription_status', 'subscription_start_date', 'created_at'],
          where: { is_active: true },
          required: false,
        });
      }

      const plan = await Plan.findByPk(planId, { include });

      if (!plan) {
        throw new Error("Plan not found");
      }

      return plan;
    } catch (error) {
      console.error("Error fetching plan:", error);
      throw error;
    }
  }

  /**
   * Create new plan with features
   */
  async createPlan(planData) {
    try {
      const { features, ...planInfo } = planData;

      // Check if plan ID already exists
      const existingPlan = await Plan.findByPk(planInfo.id);
      if (existingPlan) {
        throw new Error("Plan with this ID already exists");
      }

      // Create plan
      const plan = await Plan.create(planInfo);

      // Create features if provided
      if (features && features.length > 0) {
        const featureData = features.map((feature, index) => ({
          plan_id: plan.id,
          feature_text: feature.text,
          is_included: feature.included,
          display_order: feature.display_order || index + 1,
        }));

        await PlanFeature.bulkCreate(featureData);
      }

      // Fetch and return complete plan with features
      return await this.getPlanById(plan.id);
    } catch (error) {
      console.error("Error creating plan:", error);
      throw error;
    }
  }

  /**
   * Update plan
   */
  async updatePlan(planId, updateData) {
    try {
      const plan = await Plan.findByPk(planId);

      if (!plan) {
        throw new Error("Plan not found");
      }

      const { features, ...planInfo } = updateData;

      // Update plan info
      await plan.update(planInfo);

      // Update features if provided
      if (features) {
        // Delete existing features
        await PlanFeature.destroy({ where: { plan_id: planId } });

        // Create new features
        if (features.length > 0) {
          const featureData = features.map((feature, index) => ({
            plan_id: planId,
            feature_text: feature.text,
            is_included: feature.included,
            display_order: feature.display_order || index + 1,
          }));

          await PlanFeature.bulkCreate(featureData);
        }
      }

      // Fetch and return updated plan
      return await this.getPlanById(planId);
    } catch (error) {
      console.error("Error updating plan:", error);
      throw error;
    }
  }

  /**
   * Delete plan
   */
  async deletePlan(planId) {
    try {
      const plan = await Plan.findByPk(planId);

      if (!plan) {
        throw new Error("Plan not found");
      }

      // Check if any tenants are using this plan
      const tenantCount = await Tenant.count({
        where: { subscription_plan_id: planId, is_active: true },
      });

      if (tenantCount > 0) {
        throw new Error(`Cannot delete plan. ${tenantCount} active tenant(s) are using this plan`);
      }

      // Delete plan (features will be cascade deleted)
      await plan.destroy();

      return { message: "Plan deleted successfully" };
    } catch (error) {
      console.error("Error deleting plan:", error);
      throw error;
    }
  }

  /**
   * Get plan statistics
   */
  async getPlanStats() {
    try {
      const plans = await Plan.findAll({
        include: [
          {
            model: Tenant,
            as: 'subscribers',
            attributes: [],
            where: { is_active: true },
            required: false,
          },
        ],
        attributes: {
          include: [
            [
              sequelize.fn('COUNT', sequelize.col('subscribers.tenant_id')),
              'subscriber_count',
            ],
          ],
        },
        group: ['Plan.id'],
      });

      const totalRevenue = plans.reduce((sum, plan) => {
        const subscriberCount = parseInt(plan.getDataValue('subscriber_count')) || 0;
        const price = parseFloat(plan.price) || 0;
        return sum + (subscriberCount * price);
      }, 0);

      const activeSubscriptions = await Tenant.count({
        where: {
          is_active: true,
          subscription_status: 'active',
        },
      });

      const demoUsers = await Tenant.count({
        where: {
          is_active: true,
          subscription_plan_id: 'demo',
        },
      });

      const paidUsers = await Tenant.count({
        where: {
          is_active: true,
          subscription_plan_id: { [Op.ne]: 'demo' },
        },
      });

      return {
        totalRevenue,
        activeSubscriptions,
        demoUsers,
        paidUsers,
        planBreakdown: plans,
      };
    } catch (error) {
      console.error("Error fetching plan stats:", error);
      throw new Error("Failed to fetch plan statistics");
    }
  }

  /**
   * Get subscribers by plan
   */
  async getSubscribersByPlan(planId, { page = 1, limit = 10 } = {}) {
    try {
      const offset = (page - 1) * limit;

      const result = await Tenant.findAndCountAll({
        where: {
          subscription_plan_id: planId,
          is_active: true,
        },
        attributes: [
          'tenant_id',
          'tenant_name',
          'contact_email',
          'contact_phone',
          'subscription_status',
          'subscription_start_date',
          'subscription_end_date',
          'created_at',
        ],
        limit,
        offset,
        order: [['created_at', 'DESC']],
      });

      return {
        subscribers: result.rows,
        pagination: {
          total: result.count,
          page,
          limit,
          totalPages: Math.ceil(result.count / limit),
        },
      };
    } catch (error) {
      console.error("Error fetching subscribers:", error);
      throw new Error("Failed to fetch subscribers");
    }
  }
}

module.exports = new PlanService();