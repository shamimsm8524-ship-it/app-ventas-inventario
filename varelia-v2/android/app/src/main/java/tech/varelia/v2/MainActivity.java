package tech.varelia.v2;
import android.app.Activity;
import android.os.Bundle;
import android.content.Intent;
import android.net.Uri;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebResourceRequest;
public class MainActivity extends Activity {
 private WebView web;
 @Override public void onCreate(Bundle state) {
  super.onCreate(state);
  web=new WebView(this);
  setContentView(web);
  web.setWebViewClient(new WebViewClient(){
   @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request){
    Uri uri=request.getUrl();
    if("file".equals(uri.getScheme()) && "android_asset".equals(uri.getHost()))return false;
    String scheme=uri.getScheme();
    if("https".equals(scheme)||"http".equals(scheme)){
     try{startActivity(new Intent(Intent.ACTION_VIEW,uri));}catch(Exception ignored){}
     return true;
    }
    return true;
   }
  });
  web.setWebChromeClient(new WebChromeClient());
  WebSettings settings=web.getSettings();
  settings.setJavaScriptEnabled(true);
  settings.setDomStorageEnabled(true);
  settings.setAllowFileAccess(false);
  settings.setAllowContentAccess(false);
  settings.setAllowFileAccessFromFileURLs(false);
  settings.setAllowUniversalAccessFromFileURLs(false);
  web.loadUrl("file:///android_asset/index.html");
 }
 @Override public void onBackPressed(){if(web!=null&&web.canGoBack())web.goBack();else super.onBackPressed();}
 @Override protected void onDestroy(){if(web!=null){web.destroy();web=null;}super.onDestroy();}
}
