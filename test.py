import pandas as pd
import numpy as np
import re
import statsmodels.api as sm

from matplotlib import pyplot as plt

class qNTACalData:
    def __init__(self, cal_file):
        self.cal_file = cal_file
        self.cal_df = pd.read_excel(cal_file).fillna(0)
#        self.cal_levels = pd.Series(re.findall(r'(\d{1,9}\w+\_)',
#                                               ''.join(self.cal_df.loc[:,self.cal_df.columns.str.startswith('Conc ')].columns.tolist()))).values
#        self.cal_amts = pd.to_numeric(pd.Series(re.findall(r'\d{1,9}',
#                                                             ''.join(self.cal_df.loc[:,self.cal_df.columns.str.startswith('Conc ')].columns.tolist()))).values)
        self.cal_df_long = pd.wide_to_long(self.cal_df.loc[:,["Feature ID","Chemical Name"]+self.cal_df.columns[self.cal_df.columns.str.endswith('_')].tolist()],
                                           stubnames=['Mean',
                                                      'STD',
                                                      'CV',
                                                      'Detection Count',
                                                      'Detection Percentage',
                                                      'BlankSub Mean',
                                                      'Conc',
                                                      'RF'],
                                           i='Feature ID',
                                           j='Cal Level',
                                           sep=' ',
                                           suffix='\\w+')
        self.cal_df_long = self.cal_df_long.assign(Conc = re.findall(r'\d{1,9}',
                                               ''.join(self.cal_df_long.index.to_frame(index=False)['Cal Level'])))
        
        self.cal_df_long['Conc'] = pd.to_numeric(self.cal_df_long['Conc'])
        self.cal_df_long_nonzero = self.cal_df_long.query('`BlankSub Mean`>0')
        self.cal_df_long_nonzero = self.cal_df_long_nonzero.assign(LogAbun = np.log10(self.cal_df_long_nonzero['BlankSub Mean']),
                                               LogConc = np.log10(self.cal_df_long_nonzero['Conc']))
        self.cal_df_long_nonzero_calnames = np.unique(self.cal_df_long_nonzero['Chemical Name'])

def fit_cal_curve_model(cal_data,chem_name):
    curr_cal_data = cal_data.loc[lambda cal_data: cal_data['Chemical Name']==chem_name]
    if len(curr_cal_data)<3:
        return("Fewer than 3 calibration points")
    else:
       curr_cal_model = sm.OLS(curr_cal_data['LogAbun'],sm.add_constant(curr_cal_data['LogConc']))
       print(curr_cal_data['LogConc'])
       print(sm.add_constant(curr_cal_data['LogConc']))
       
       return(curr_cal_model) 
    
def plot_cal_curve(cal_curve_model,chem_name,savefig=True):
    cal_curve_model_results = cal_curve_model.fit()
    cal_curve_model_preds = cal_curve_model_results.get_prediction()
    #conf_int, conf_int_el are other ways to get confidence interval?
    cal_curve_model_CI_lower = cal_curve_model_preds.summary_frame()["obs_ci_lower"]
    cal_curve_model_CI_upper = cal_curve_model_preds.summary_frame()["obs_ci_upper"]
    
    print(cal_curve_model_CI_lower)
    
    #matplotlib pyplot
    fig, ax = plt.subplots(figsize=(8, 8))
    ax.plot(cal_curve_model.exog[:,1], cal_curve_model.endog, "o", label="Data")
    ax.plot(cal_curve_model.exog[:,1], cal_curve_model_results.fittedvalues, "b-", label="Fit")
    ax.plot(cal_curve_model.exog[:,1], cal_curve_model_CI_lower, "r--")
    ax.plot(cal_curve_model.exog[:,1], cal_curve_model_CI_upper, "r--")
    ax.legend(loc="best")
    
    cal_curve_model_params = cal_curve_model_results.params.round(3)
    cal_curve_model_equation = "LogAbun = " + str(cal_curve_model_params.iloc[0]) + "LogConc"
    if(len(cal_curve_model_params > 1)):
        cal_curve_model_equation = "LogAbun = " + str(cal_curve_model_params.iloc[0]) + " + " + str(cal_curve_model_params.iloc[1]) + "LogConc"
    fig.suptitle(chem_name +" \n "+ cal_curve_model_equation + ", R-squared: " + str(cal_curve_model_results.rsquared.round(3)))
    
    if savefig:
        plt.savefig(chem_name + "_Cal_Curve.png")    
            
FILE_NAME = "./data/qNTA_Surrogate_Detection_Statistics_File_WW2DW.xlsx"
qNTA_cal_data = qNTACalData(FILE_NAME)

cal_curve_models = []
for chem in qNTA_cal_data.cal_df_long_nonzero_calnames:
    if chem != "hydrocortisone":
        continue
    print(chem)
    curr_cal = fit_cal_curve_model(qNTA_cal_data.cal_df_long_nonzero,chem)
    print(curr_cal)
    if isinstance(curr_cal,str):
       print(chem + " has fewer than 3 calibration points")
       cal_curve_models.append(curr_cal)
       pass
    else:
        
        cal_curve_models.append(curr_cal)
        plot_cal_curve(curr_cal,chem)