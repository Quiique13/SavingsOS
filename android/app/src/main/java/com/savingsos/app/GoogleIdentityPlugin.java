package com.savingsos.app;

import android.os.CancellationSignal;
import androidx.core.content.ContextCompat;
import androidx.credentials.Credential;
import androidx.credentials.CredentialManager;
import androidx.credentials.CredentialManagerCallback;
import androidx.credentials.CustomCredential;
import androidx.credentials.GetCredentialRequest;
import androidx.credentials.GetCredentialResponse;
import androidx.credentials.exceptions.GetCredentialCancellationException;
import androidx.credentials.exceptions.GetCredentialException;
import androidx.credentials.exceptions.NoCredentialException;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption;
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential;
import java.util.UUID;

/** Opens Google's native account chooser. Firebase JS verifies the returned ID
 * token, keeping email and Google sessions in the same Firestore identity. */
@CapacitorPlugin(name = "GoogleIdentity")
public class GoogleIdentityPlugin extends Plugin {
    private CancellationSignal pending;

    @PluginMethod
    public synchronized void signIn(PluginCall call) {
        if (pending != null) {
            call.reject("Please wait for the current user change to finish.", "native-google/busy");
            return;
        }
        int resource = getContext().getResources().getIdentifier("default_web_client_id", "string", getContext().getPackageName());
        if (resource == 0) {
            call.reject("Google sign-in is not configured for this Android app.", "native-google/not-configured");
            return;
        }
        String clientId = getContext().getString(resource);
        GetSignInWithGoogleOption option = new GetSignInWithGoogleOption.Builder(clientId)
            .setNonce(UUID.randomUUID().toString()).build();
        GetCredentialRequest request = new GetCredentialRequest.Builder().addCredentialOption(option).build();
        pending = new CancellationSignal();
        CancellationSignal cancellation = pending;
        getActivity().runOnUiThread(() -> {
            try {
                CredentialManager.create(getContext()).getCredentialAsync(
                    getActivity(), request, cancellation, ContextCompat.getMainExecutor(getContext()),
                    new CredentialManagerCallback<GetCredentialResponse, GetCredentialException>() {
                        @Override
                        public void onResult(GetCredentialResponse response) {
                            pending = null;
                            try {
                                Credential credential = response.getCredential();
                                if (!(credential instanceof CustomCredential) ||
                                    !GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL.equals(credential.getType())) {
                                    call.reject("Google sign-in did not return a valid identity.");
                                    return;
                                }
                                GoogleIdTokenCredential token = GoogleIdTokenCredential.createFrom(credential.getData());
                                JSObject result = new JSObject();
                                result.put("idToken", token.getIdToken());
                                call.resolve(result);
                            } catch (Exception error) {
                                call.reject("Google sign-in did not return a valid identity.", "native-google/invalid-token", error);
                            }
                        }

                        @Override
                        public void onError(GetCredentialException error) {
                            pending = null;
                            if (error instanceof GetCredentialCancellationException)
                                call.reject("Google sign-in did not finish. If you did not cancel, check the Android app's package and signing certificate in Firebase.", "native-google/not-completed", error);
                            else if (error instanceof NoCredentialException)
                                call.reject("Add a Google account to this device, then try again.", "native-google/no-credential", error);
                            else call.reject("Google sign-in could not open. Check this Android app's Firebase configuration and signing certificate.", "native-google/configuration", error);
                        }
                    }
                );
            } catch (Exception error) {
                pending = null;
                call.reject("Google sign-in could not open. Check this Android app's Firebase configuration and signing certificate.", "native-google/configuration", error);
            }
        });
    }

    @Override
    protected void handleOnDestroy() {
        if (pending != null) pending.cancel();
        pending = null;
    }
}
